import { Modal, notify } from '@affine/component';
import { MenuItem } from '@affine/core/modules/app-sidebar/views';
import { AuthService } from '@affine/core/modules/cloud';
import { QrCodePanelIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import QrCreator from 'qr-creator';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type LanIpItem = {
  ip: string;
  label: string;
  kind: 'lan' | 'vpn' | 'other';
};

export const MobileQrButton = () => {
  const authService = useService(AuthService);
  const sessionStatus = useLiveData(authService.session.status$);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [lanIps, setLanIps] = useState<LanIpItem[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchQrHandoff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authService.createMobileQrHandoff();
      setCode(result.code);
      setLanIps(result.lanIps);
      if (result.lanIps.length > 0) {
        setSelectedIp(prev =>
          prev && result.lanIps.some(item => item.ip === prev)
            ? prev
            : result.lanIps[0].ip
        );
      } else if (typeof window !== 'undefined') {
        setSelectedIp(window.location.hostname);
      }
    } finally {
      setLoading(false);
    }
  }, [authService]);

  useEffect(() => {
    if (open) {
      fetchQrHandoff().catch(console.error);
    }
  }, [open, fetchQrHandoff, sessionStatus]);

  const targetUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol || 'http:';
    const host = selectedIp || window.location.hostname || 'localhost';
    const port = window.location.port ? `:${window.location.port}` : '';
    const pathname = window.location.pathname || '/';
    const url = new URL(`${protocol}//${host}${port}${pathname}`);
    if (code) {
      url.searchParams.set('aevum_qr_code', code);
    }
    return url.toString();
  }, [code, selectedIp]);

  const displayUrl = useMemo(() => {
    if (!targetUrl) return '';
    try {
      const u = new URL(targetUrl);
      u.searchParams.delete('aevum_qr_code');
      return u.toString();
    } catch {
      return targetUrl;
    }
  }, [targetUrl]);

  useEffect(() => {
    if (!open || !targetUrl) return;
    const timer = requestAnimationFrame(() => {
      const el = qrContainerRef.current;
      if (!el) return;
      el.innerHTML = '';
      try {
        QrCreator.render(
          {
            text: targetUrl,
            radius: 0.35,
            ecLevel: 'M',
            fill: '#0f172a',
            background: '#ffffff',
            size: 216,
          },
          el
        );
      } catch (err) {
        console.error('Failed to render QR code:', err);
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [open, targetUrl]);

  const handleCopy = useCallback(() => {
    if (!targetUrl) return;
    navigator.clipboard
      .writeText(targetUrl)
      .then(() => {
        setCopied(true);
        notify.success({ title: 'Mobile handoff link copied to clipboard' });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
  }, [targetUrl]);

  return (
    <>
      <MenuItem
        data-testid="slider-bar-mobile-qr-button"
        icon={<QrCodePanelIcon />}
        onClick={() => setOpen(true)}
      >
        <span data-testid="mobile-qr-modal-trigger">Open on Mobile</span>
      </MenuItem>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={420}
        contentOptions={{
          style: {
            padding: '28px 28px 24px',
            borderRadius: '16px',
            overscrollBehavior: 'contain',
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--affine-text-primary-color)',
                marginBottom: '6px',
              }}
            >
              Open Aevum on Mobile
            </div>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.45,
                color: 'var(--affine-text-secondary-color)',
              }}
            >
              Scan with your phone camera on the same Wi-Fi or Tailscale network
              to continue right where you left off.
            </div>
          </div>

          {lanIps.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {lanIps.map(item => {
                const active = item.ip === selectedIp;
                return (
                  <button
                    key={item.ip}
                    type="button"
                    onClick={() => setSelectedIp(item.ip)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: active
                        ? '1px solid var(--affine-primary-color, #1e96eb)'
                        : '1px solid var(--affine-border-color)',
                      background: active
                        ? 'var(--affine-hover-color)'
                        : 'transparent',
                      color: active
                        ? 'var(--affine-text-primary-color)'
                        : 'var(--affine-text-secondary-color)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.label}: {item.ip}
                  </button>
                );
              })}
            </div>
          )}

          <div
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '248px',
              minHeight: '248px',
              position: 'relative',
            }}
          >
            <div
              ref={qrContainerRef}
              style={{
                width: '216px',
                height: '216px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.35 : 1,
                transition: 'opacity 0.15s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              background: code
                ? 'rgba(16, 185, 129, 0.14)'
                : 'rgba(148, 163, 184, 0.14)',
              color: code ? '#10b981' : 'var(--affine-text-secondary-color)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: code ? '#10b981' : '#94a3b8',
              }}
            />
            {code
              ? 'Instant Auto-Login Enabled (One-Time Token)'
              : 'Direct LAN URL (Sign in on device)'}
          </div>

          <div
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--affine-hover-color)',
              border: '1px solid var(--affine-border-color)',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--affine-text-secondary-color)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
            title={displayUrl}
          >
            {displayUrl}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={handleCopy}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid var(--affine-border-color)',
                background: 'var(--affine-background-primary-color)',
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {copied ? 'Copied!' : 'Copy Handoff Link'}
            </button>
            <button
              type="button"
              onClick={() => {
                fetchQrHandoff().catch(console.error);
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: loading ? 'default' : 'pointer',
                border: 'none',
                background: 'var(--affine-primary-color, #1e96eb)',
                color: '#ffffff',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh QR Code'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
