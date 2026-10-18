import { setServers } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';

function getLocalNetworkIps() {
  const nets = networkInterfaces();
  const list: { ip: string; label: string; kind: 'lan' | 'vpn' | 'other' }[] =
    [];
  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      if (
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
      ) {
        list.push({ ip, label: `Wi-Fi / LAN (${name})`, kind: 'lan' });
      } else if (ip.startsWith('100.')) {
        list.push({ ip, label: `Tailscale / VPN (${name})`, kind: 'vpn' });
      } else {
        list.push({ ip, label: `Network (${name})`, kind: 'other' });
      }
    }
  }
  const order = { lan: 0, vpn: 1, other: 2 };
  list.sort((a, b) => order[a.kind] - order[b.kind]);
  return list;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  ActionForbidden,
  EmailTokenNotFound,
  getClientVersionFromRequest,
  getRequestCookie,
  InvalidAuthState,
  InvalidEmail,
  NetworkError,
  Throttle,
  UseNamedGuard,
} from '../../base';
import { BackendRuntimeProvider } from '../backend-runtime';
import { validators } from '../utils/validators';
import { AuthSessionService } from './auth-session';
import { Public } from './guard';
import {
  AuthPreflightBodySchema,
  AuthSessionExchangeBodySchema,
  AuthSessionRefreshBodySchema,
  isNativeClientRequest,
  MagicLinkBodySchema,
  OpenAppSignInBodySchema,
  SessionIdSchema,
  SignInBodySchema,
} from './input';
import {
  createKanbanBoard,
  deleteKanbanBoards,
  deleteKanbanCard,
  getKanbanBoardDetail,
  type KanbanAccessContext,
  listKanbanBoards,
  updateKanbanBoard,
  upsertKanbanCard,
} from './kanban-store';
import { MagicLinkAuthService } from './magic-link';
import { OpenAppAuthService } from './open-app';
import { AuthService } from './service';
import { AuthSessionPrincipal, CurrentUser, Session } from './session';
import { SessionExchangeService } from './session-exchange';
import { SessionIssuer } from './session-issuer';

interface PreflightResponse {
  registered: boolean;
  methods: {
    password: { available: boolean };
    magicLink: { available: boolean };
    oauth: { available: boolean; providers: string[] };
    passkey: { available: boolean; discoverable: boolean };
  };
}

type SignInResponse = CurrentUser & {
  exchangeCode?: string;
};

@Throttle('strict')
@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly magicLink: MagicLinkAuthService,
    private readonly openApp: OpenAppAuthService,
    private readonly runtime: BackendRuntimeProvider,
    private readonly sessionExchange: SessionExchangeService,
    private readonly authSessions: AuthSessionService
  ) {
    if (env.dev) {
      // set DNS servers in dev mode
      // NOTE: some network debugging software uses DNS hijacking
      // to better debug traffic, but their DNS servers may not
      // handle the non dns query(like txt, mx) correctly, so we
      // set a public DNS server here to avoid this issue.
      setServers(['1.1.1.1', '8.8.8.8']);
    }
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/preflight')
  async preflight(@Body() body?: unknown): Promise<PreflightResponse> {
    const input = AuthPreflightBodySchema.safeParse(body);
    if (!input.success) {
      throw new InvalidEmail({ email: 'not provided' });
    }
    validators.assertValidEmail(input.data.email);

    try {
      const result =
        await this.runtime.executeAuthSessionCommandV1<PreflightResponse>({
          action: 'login_preflight',
          email: input.data.email,
        });
      return {
        ...result,
        methods: {
          ...result.methods,
          password: {
            available:
              result.methods.password.available ||
              result.methods.magicLink.available,
          },
        },
      };
    } catch (error) {
      if (String(error).includes('email_domain_verification_unavailable')) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  @UseNamedGuard('version')
  @Get('/methods')
  async boundMethods(@CurrentUser() user: CurrentUser) {
    return this.runtime.executeAuthSessionCommandV1({
      action: 'bound_methods',
      userId: user.id,
    });
  }

  @Public()
  @UseNamedGuard('version', 'captcha')
  @Post('/sign-in')
  @Header('content-type', 'application/json')
  async signIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: unknown
  ) {
    const credential = SignInBodySchema.parse(body);
    validators.assertValidEmail(credential.email);
    const canSignIn = await this.auth.canSignIn(credential.email, req);
    if (!canSignIn) {
      throw new ActionForbidden();
    }

    if (credential.password) {
      await this.passwordSignIn(
        req,
        res,
        credential.email,
        credential.password
      );
    } else {
      await this.sendMagicLink(
        req,
        res,
        credential.email,
        credential.callbackUrl,
        credential.client_nonce
      );
    }
  }

  async passwordSignIn(
    req: Request,
    res: Response,
    email: string,
    password: string
  ) {
    const result = await this.auth.passwordLogin(
      email,
      password,
      this.sessionIssuer.target(req)
    );
    this.sessionIssuer.apply(res, result);
    res.status(HttpStatus.OK).send({
      ...result.user,
      exchangeCode: result.exchangeCode,
    } satisfies SignInResponse);
  }

  async sendMagicLink(
    req: Request,
    res: Response,
    email: string,
    callbackUrl = '/magic-link',
    clientNonce?: string
  ) {
    const payload = await this.magicLink.send(
      email,
      callbackUrl,
      clientNonce,
      this.auth.requestSource(req)
    );
    res.status(HttpStatus.OK).send(payload);
  }

  @Post('/sign-out')
  async signOut(
    @Req() req: Request,
    @Res() res: Response,
    @Session() session: Session | AuthSessionPrincipal | undefined,
    @Query('user_id') userId: string | undefined
  ) {
    if (!session) {
      res.status(HttpStatus.OK).send({});
      return;
    }

    if (req.authType === 'jwt') {
      const authSessionId = (session as Partial<AuthSessionPrincipal>)
        .authSessionId;
      if (authSessionId) {
        await this.authSessions.revoke(
          authSessionId,
          'current_device_sign_out',
          session.user.id
        );
      }
      res.status(HttpStatus.OK).send({});
      return;
    }

    const csrfCookie = getRequestCookie(req, AuthService.csrfCookieName);
    const csrfHeader = req.get('x-affine-csrf-token');
    if (!csrfHeader || !csrfCookie || csrfCookie !== csrfHeader) {
      throw new ActionForbidden();
    }

    await this.auth.signOut(session.sessionId, userId);
    await this.auth.refreshCookies(res, session.sessionId);

    res.status(HttpStatus.OK).send({});
  }

  @Public()
  @UseNamedGuard('version')
  @Get('/open-app/network-info')
  async openAppNetworkInfo() {
    return { lanIps: getLocalNetworkIps() };
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Post('/open-app/hrm-rent-schedule')
  async openAppHrmRentSchedule(@Body() body?: Record<string, unknown>) {
    const rawBaseUrl = String(
      body?.baseUrl || process.env.EXTERNAL_SCHEDULE_API_URL || ''
    ).trim();
    const cleanToken = String(body?.token || body?.bearerToken || '')
      .trim()
      .replace(/^Bearer\s+/i, '');
    const customEndpoint = String(body?.customEndpoint || '').trim();
    const filterKeyword = String(body?.filterKeyword || '')
      .trim()
      .toLowerCase();
    const mode = String(body?.mode || 'related'); // 'related' | 'creator' | 'participant' | 'all'
    const fromIso = String(body?.from || '').trim();
    const toIso = String(body?.to || '').trim();

    if (!rawBaseUrl && !customEndpoint) {
      return {
        ok: false,
        error:
          'Chưa cấu hình Base URL trong mục Config API. Vui lòng nhập URL hệ thống lịch của bạn.',
        items: [],
        totalCount: 0,
        syncedAt: new Date().toISOString(),
      };
    }

    let apiRoot = rawBaseUrl.split('#')[0].replace(/\/+$/, '');
    try {
      const parsed = new URL(apiRoot);
      if (parsed.pathname === '' || parsed.pathname === '/') {
        apiRoot = `${parsed.origin}/hrm`;
      }
    } catch {
      // keep apiRoot as-is
    }

    const toMdy = (isoStr: string, endOfDay = false) => {
      const d = isoStr ? new Date(isoStr) : new Date();
      if (Number.isNaN(d.getTime())) {
        return endOfDay ? '12/31/2026, 23:59:59' : '1/01/2026';
      }
      const m = d.getMonth() + 1;
      const day = String(d.getDate()).padStart(2, '0');
      const y = d.getFullYear();
      return endOfDay ? `${m}/${day}/${y}, 23:59:59` : `${m}/${day}/${y}`;
    };

    const fromParam = toMdy(fromIso, false);
    const toParam = toMdy(toIso, true);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (cleanToken) {
      headers.Authorization = `Bearer ${cleanToken}`;
    }

    const fetchJson = async (url: string) => {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `HRM API HTTP ${response.status}: ${text.slice(0, 180) || response.statusText}`
        );
      }
      return (await response.json()) as unknown;
    };

    try {
      let userProfile: Record<string, unknown> | null = null;
      if (cleanToken && !customEndpoint) {
        try {
          const prof = await fetchJson(`${apiRoot}/api/v1/user/profile`);
          if (prof && typeof prof === 'object') {
            userProfile = prof as Record<string, unknown>;
          }
        } catch {
          // ignore profile fetch error if token only has ticket scope
        }
      }

      const rawItems: Array<Record<string, unknown>> = [];

      const extractItems = (
        payload: unknown,
        role: 'creator' | 'participant' | 'related'
      ) => {
        if (!payload) return;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { items?: unknown[] }).items)
            ? (payload as { items: unknown[] }).items
            : Array.isArray((payload as { data?: unknown[] }).data)
              ? (payload as { data: unknown[] }).data
              : [];

        for (const entry of list) {
          if (!entry || typeof entry !== 'object') continue;
          const obj = entry as Record<string, unknown>;
          // Check if this is an overview-schedule resource wrapper with nested schedules
          if (
            Array.isArray(obj.schedules) ||
            Array.isArray(obj.rentSchedules)
          ) {
            const nested = (obj.schedules || obj.rentSchedules) as unknown[];
            for (const sub of nested) {
              if (sub && typeof sub === 'object') {
                rawItems.push({
                  ...(sub as Record<string, unknown>),
                  resourceName:
                    (sub as Record<string, unknown>).resourceName ||
                    obj.resourceName ||
                    obj.name,
                  _role: role,
                });
              }
            }
          } else {
            rawItems.push({ ...obj, _role: obj._role || role });
          }
        }
      };

      if (customEndpoint) {
        const targetUrl = customEndpoint.startsWith('http')
          ? customEndpoint
          : `${apiRoot}${customEndpoint.startsWith('/') ? '' : '/'}${customEndpoint}`;
        const data = await fetchJson(targetUrl);
        extractItems(data, 'related');
      } else {
        const tasks: Promise<void>[] = [];
        const qs = new URLSearchParams({
          from: fromParam,
          to: toParam,
          maxResultCount: '1000',
          skipCount: '0',
        }).toString();

        if (mode === 'related' || mode === 'creator' || mode === 'all') {
          tasks.push(
            fetchJson(
              `${apiRoot}/api/v1/resource-ticket/get-by-user?${qs}`
            ).then(data => extractItems(data, 'creator'))
          );
        }
        if (mode === 'related' || mode === 'participant' || mode === 'all') {
          tasks.push(
            fetchJson(
              `${apiRoot}/api/v1/resource-ticket/get-for-user-participant?${qs}`
            ).then(data => extractItems(data, 'participant'))
          );
        }
        if (mode === 'all') {
          const overviewQs = new URLSearchParams({
            FromTime: fromIso || new Date().toISOString().slice(0, 10),
            ToTime: toIso || new Date().toISOString().slice(0, 10),
            FilterStatus: '0',
            SkipCount: '0',
            MaxResultCount: '1000',
          }).toString();
          tasks.push(
            fetchJson(
              `${apiRoot}/api/v1/resource/overview-schedule?${overviewQs}`
            )
              .then(data => extractItems(data, 'related'))
              .catch(() => undefined)
          );
        }

        const results = await Promise.allSettled(tasks);
        const allFailed =
          results.length > 0 && results.every(r => r.status === 'rejected');
        if (allFailed) {
          const firstReason = (results[0] as PromiseRejectedResult).reason;
          throw firstReason instanceof Error
            ? firstReason
            : new Error(String(firstReason));
        }
      }

      const seen = new Map<string, Record<string, unknown>>();
      for (const item of rawItems) {
        const id = String(
          item.id ||
            item.ticketId ||
            `${item.title || ''}-${item.startTime || ''}`
        );
        if (!seen.has(id)) {
          seen.set(id, {
            id,
            title: String(
              item.title || item.subject || item.name || 'Lịch thuê tài sản'
            ),
            startTime: String(
              item.startTime || item.fromTime || item.startDate || ''
            ),
            endTime: String(item.endTime || item.toTime || item.endDate || ''),
            resourceName: String(
              item.resourceName ||
                item.roomName ||
                item.assetName ||
                item.resourceTypeName ||
                ''
            ),
            ownerName: String(
              item.ownerName ||
                item.fullName ||
                item.createdByName ||
                item.userName ||
                ''
            ),
            description: String(item.description || item.note || ''),
            status: String(
              item.resourceTicketStatusName ||
                item.statusName ||
                item.status ||
                'Active'
            ),
            role: item._role || 'related',
            members: Array.isArray(item.members)
              ? item.members
              : Array.isArray(item.participants)
                ? item.participants
                : [],
          });
        }
      }

      let normalized = Array.from(seen.values());
      if (filterKeyword) {
        normalized = normalized.filter(item => {
          const haystack = [
            item.title,
            item.resourceName,
            item.ownerName,
            item.description,
            JSON.stringify(item.members || []),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(filterKeyword);
        });
      }

      normalized.sort((a, b) =>
        String(a.startTime).localeCompare(String(b.startTime))
      );

      return {
        ok: true,
        apiRoot,
        userProfile,
        items: normalized,
        totalCount: normalized.length,
        syncedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        items: [],
        totalCount: 0,
        syncedAt: new Date().toISOString(),
      };
    }
  }

  private async resolveKanbanAccess(
    user?: CurrentUser,
    roleParam?: unknown,
    emailParam?: unknown
  ): Promise<KanbanAccessContext> {
    const roleStr = String(roleParam || '')
      .trim()
      .toLowerCase();
    const emailStr = String(user?.email || emailParam || '')
      .trim()
      .toLowerCase();

    const userName =
      emailStr === 'admin@aevum.io'
        ? 'Supervisor'
        : emailStr === 'baoltb@aevum.app'
          ? 'Bảo Bảo'
          : emailStr === 'team@affine.pro'
            ? 'Team User'
            : String(user?.name || '').trim() || 'Supervisor';

    if (roleStr === 'member' || roleStr === 'user' || roleStr === 'guest') {
      return { isAdmin: false, userEmail: emailStr, userName };
    }

    const isAdmin = await this.auth.isUserAdmin(user?.id, emailStr);
    return {
      isAdmin,
      userEmail: emailStr,
      userName,
    };
  }

  private async buildKanbanReviewers(): Promise<string[]> {
    return await this.auth.listActiveUserNames();
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Get('/open-app/kanban/boards')
  async getKanbanBoardsList(
    @CurrentUser() user?: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
    @Query('role') role?: string,
    @Query('userEmail') userEmail?: string
  ) {
    const wsId = String(workspaceId || 'default').trim();
    const access = await this.resolveKanbanAccess(user, role, userEmail);
    const [boards, reviewers] = await Promise.all([
      listKanbanBoards(wsId, access),
      this.buildKanbanReviewers(),
    ]);
    return {
      ok: true,
      workspaceId: wsId,
      isAdmin: Boolean(access.isAdmin),
      userEmail: access.userEmail,
      userName: access.userName,
      harnessBackend: process.env.HARNESS_BACKEND || 'floci',
      s3Bucket: process.env.FLOCI_S3_BUCKET || 'harness-data',
      reviewers,
      boards,
      totalCount: boards.length,
    };
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Get('/open-app/kanban/boards/:boardId')
  async getKanbanBoardDetailById(
    @Param('boardId') boardId: string,
    @CurrentUser() user?: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
    @Query('role') role?: string,
    @Query('userEmail') userEmail?: string
  ) {
    const wsId = String(workspaceId || 'default').trim();
    const access = await this.resolveKanbanAccess(user, role, userEmail);
    const [board, reviewers] = await Promise.all([
      getKanbanBoardDetail(wsId, boardId, access),
      this.buildKanbanReviewers(),
    ]);
    if (!board) {
      return {
        ok: false,
        error: `Không tìm thấy bảng Kanban #${boardId}`,
        board: null,
      };
    }
    return {
      ok: true,
      workspaceId: wsId,
      isAdmin: Boolean(access.isAdmin),
      userName: access.userName,
      reviewers,
      board,
    };
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Post('/open-app/kanban/boards')
  async mutateKanbanBoards(
    @CurrentUser() user?: CurrentUser,
    @Body() body?: Record<string, unknown>
  ) {
    const wsId = String(body?.workspaceId || 'default').trim();
    const action = String(body?.action || 'create').trim();
    const access = await this.resolveKanbanAccess(
      user,
      body?.role,
      body?.userEmail
    );

    if (action === 'delete') {
      const ids = Array.isArray(body?.boardIds)
        ? body.boardIds.map(String)
        : body?.boardId
          ? [String(body.boardId)]
          : [];
      const boards = await deleteKanbanBoards(wsId, ids, access);
      return {
        ok: true,
        workspaceId: wsId,
        boards,
      };
    }

    const board = createKanbanBoard(wsId, body ?? {}, access);
    const boards = await listKanbanBoards(wsId, access);
    return {
      ok: true,
      workspaceId: wsId,
      board,
      boards,
    };
  }

  @Throttle('default', { limit: 1200 })
  @Public()
  @Post('/open-app/kanban/boards/:boardId')
  async mutateKanbanBoardById(
    @Param('boardId') boardId: string,
    @CurrentUser() user?: CurrentUser,
    @Body() body?: Record<string, unknown>
  ) {
    const wsId = String(body?.workspaceId || 'default').trim();
    const action = String(body?.action || 'update-board').trim();
    const access = await this.resolveKanbanAccess(
      user,
      body?.role,
      body?.userEmail
    );

    if (action === 'upsert-card') {
      const cardData =
        body?.card && typeof body.card === 'object'
          ? (body.card as Record<string, unknown>)
          : (body ?? {});
      const board = await upsertKanbanCard(wsId, boardId, cardData, access);
      const boards = await listKanbanBoards(wsId, access);
      return {
        ok: Boolean(board),
        workspaceId: wsId,
        board,
        boards,
      };
    }

    if (action === 'delete-card') {
      const cardId = String(body?.cardId || '').trim();
      const board = await deleteKanbanCard(wsId, boardId, cardId, access);
      const boards = await listKanbanBoards(wsId, access);
      return {
        ok: Boolean(board),
        workspaceId: wsId,
        board,
        boards,
      };
    }

    const board = await updateKanbanBoard(wsId, boardId, body ?? {}, access);
    const boards = await listKanbanBoards(wsId, access);
    return {
      ok: Boolean(board),
      workspaceId: wsId,
      board,
      boards,
    };
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/open-app/sign-in-code')
  async openAppSignInCode(@CurrentUser() user?: CurrentUser) {
    if (!user) throw new ActionForbidden();
    const code = await this.openApp.createSignInCode(user);
    return { code, lanIps: getLocalNetworkIps() };
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/open-app/sign-in')
  async openAppSignIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: unknown
  ) {
    const credential = OpenAppSignInBodySchema.safeParse(body);
    if (!credential.success) throw new InvalidAuthState();
    const result = await this.openApp.complete(
      credential.data.code,
      this.sessionIssuer.target(req)
    );
    this.sessionIssuer.apply(res, result);
    res.send({ id: result.user.id, exchangeCode: result.exchangeCode });
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/session/exchange')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async exchangeSession(@Req() req: Request, @Body() body?: unknown) {
    const input = AuthSessionExchangeBodySchema.parse(body);
    return await this.sessionExchange.exchange(req, input.code, {
      installationId: input.installationId,
      platform: input.platform,
      deviceName: input.deviceName,
      appVersion: getClientVersionFromRequest(req) ?? undefined,
    });
  }

  @Public()
  @UseNamedGuard('version')
  @Throttle('default', { limit: 120, ttl: 60_000 })
  @Post('/session/refresh')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async refreshAuthSession(@Req() req: Request, @Body() body?: unknown) {
    const input = AuthSessionRefreshBodySchema.parse(body);
    return await this.sessionExchange.refresh(
      req,
      input.refreshToken,
      getClientVersionFromRequest(req) ?? undefined
    );
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/session/revoke')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async revokeCurrentAuthSession(@Req() req: Request, @Body() body?: unknown) {
    if (!isNativeClientRequest(req)) {
      throw new ActionForbidden();
    }
    const input = AuthSessionRefreshBodySchema.parse(body);
    await this.authSessions.revokeWithRefreshToken(input.refreshToken);
    return {};
  }

  @Get('/sessions')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async listAuthSessions(
    @CurrentUser() user: CurrentUser,
    @Session() session: Session | AuthSessionPrincipal | undefined
  ) {
    const currentId = (session as Partial<AuthSessionPrincipal> | undefined)
      ?.authSessionId;
    return (await this.authSessions.list(user.id)).map(item => ({
      ...item,
      current: item.id === currentId,
    }));
  }

  @Post('/sessions/revoke-all')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async revokeAllAuthSessions(
    @Req() req: Request,
    @CurrentUser() user: CurrentUser,
    @Session() session: Session | AuthSessionPrincipal | undefined
  ) {
    this.assertSessionMutationAuthorized(req, session);
    await this.auth.revokeUserSessions(user.id);
    return {};
  }

  @Delete('/sessions/:id')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async revokeAuthSession(
    @Req() req: Request,
    @CurrentUser() user: CurrentUser,
    @Session() session: Session | AuthSessionPrincipal | undefined,
    @Param('id') authSessionId: string
  ) {
    const parsedSessionId = SessionIdSchema.safeParse(authSessionId);
    if (!parsedSessionId.success) throw new InvalidAuthState();
    this.assertSessionMutationAuthorized(req, session);
    await this.authSessions.revoke(
      parsedSessionId.data,
      'user_action',
      user.id
    );
    return {};
  }

  @Public()
  @UseNamedGuard('version')
  @Post('/magic-link')
  async magicLinkSignIn(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: unknown
  ) {
    const credential = MagicLinkBodySchema.safeParse(body);
    if (!credential.success) throw new EmailTokenNotFound();
    const { email, token: otp, client_nonce: clientNonce } = credential.data;
    if (!email) throw new EmailTokenNotFound();
    validators.assertValidEmail(email);
    const result = await this.magicLink.complete(
      email,
      otp,
      clientNonce,
      this.sessionIssuer.target(req)
    );
    this.sessionIssuer.apply(res, result);
    res.send({ id: result.user.id, exchangeCode: result.exchangeCode });
  }

  @UseNamedGuard('version')
  @Throttle('default', { limit: 1200 })
  @Public()
  @Get('/session')
  @Header('Cache-Control', 'no-store')
  async currentSessionUser(@CurrentUser() user?: CurrentUser) {
    return { user };
  }

  private assertSessionMutationAuthorized(
    req: Request,
    session: Session | AuthSessionPrincipal | undefined
  ) {
    if (req.authType === 'jwt') {
      const principal = session as Partial<AuthSessionPrincipal> | undefined;
      if (principal?.authSessionId) return;
    } else if (req.authType === 'session') {
      const csrfCookie = getRequestCookie(req, AuthService.csrfCookieName);
      const csrfHeader = req.get('x-affine-csrf-token');
      if (csrfHeader && csrfCookie && csrfCookie === csrfHeader) return;
    }
    throw new ActionForbidden();
  }
}
