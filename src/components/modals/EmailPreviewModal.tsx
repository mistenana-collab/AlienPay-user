import React from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  recipient?: string;
  emailHtml: string | null;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  title = 'Email Template Preview',
  recipient,
  emailHtml,
}) => {
  if (!isOpen || !emailHtml) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text-primary)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            backgroundColor: 'var(--app-surface-elevated)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xs sm:text-sm" style={{ color: 'var(--app-text-primary)' }}>
                {title}
              </h3>
              {recipient && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--app-text-dim)' }}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>To: {recipient}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer hover:opacity-80"
            style={{ color: 'var(--app-text-dim)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-100 p-2">
          <iframe
            title="Email Preview"
            srcDoc={emailHtml}
            className="w-full h-[460px] rounded-xl border-0 bg-white shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
