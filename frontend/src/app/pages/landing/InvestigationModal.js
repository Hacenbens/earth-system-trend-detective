'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { REGION_OPTIONS, WORKFLOW_LAYERS } from '@/app/api/earthSignalData';

export function InvestigationModal({ modal, onClose, onSwitchToInvestigation }) {
  const [activeLayer, setActiveLayer] = useState('detect');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [signInSuccess, setSignInSuccess] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => {
    if (modal.type === 'investigation') {
      setActiveLayer(modal.initialLayer ?? 'detect');
    }
    if (modal.type === 'signin') {
      setSignInSuccess(false);
      setSignInError('');
    }
  }, [modal]);

  useEffect(() => {
    if (modal.type === 'closed') return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal.type, onClose]);

  if (modal.type === 'closed') return null;

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setSignInError('Please enter a valid research or institutional email.');
      return;
    }
    setSignInError('');
    setSignInSuccess(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0B1224]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[28px] bg-[#131D38] text-[#f4f1ea] border border-[#f4f1ea]/15 p-6 sm:p-9 shadow-instrument-dark"
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#f4f1ea]/10">
          <div>
            {modal.type === 'investigation' && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                  INVESTIGATION WORKSPACE PREVIEW
                </p>
                <h3 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-semibold text-[#f4f1ea]">
                  {modal.query.region} · {modal.query.variable}
                </h3>
              </>
            )}

            {modal.type === 'discovery' && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                  CAPABILITY MODULE
                </p>
                <h3 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-semibold text-[#f4f1ea]">
                  {modal.card.title}
                </h3>
              </>
            )}

            {modal.type === 'methodology' && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4FB3A9]">
                  SCIENTIFIC HONESTY & PROVENANCE
                </p>
                <h3 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-semibold text-[#f4f1ea]">
                  {modal.tab === 'method'
                    ? 'Statistical & Physical Methodology'
                    : 'Dataset Provenance Standards'}
                </h3>
              </>
            )}

            {modal.type === 'signin' && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ffc20d]">
                  RESEARCHER ACCESS
                </p>
                <h3 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-semibold text-[#f4f1ea]">
                  Sign in to EarthSignal
                </h3>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-10 h-10 rounded-full bg-[#1E2B52] text-[#f4f1ea] hover:bg-[#f4f1ea] hover:text-[#131D38] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY: Investigation Preview */}
        {modal.type === 'investigation' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-[20px] bg-[#1E2B52] p-4 border border-[#f4f1ea]/10">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#A9B1C6]">
                  Study Bounding Box
                </div>
                <div className="mt-1 font-mono text-[13px] text-[#f4f1ea] tabular-nums">
                  {REGION_OPTIONS.find((r) => r.label === modal.query.region)?.coords ??
                    '10°N–20°N, 18°W–20°E'}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#A9B1C6]">
                  Primary Variable
                </div>
                <div className="mt-1 font-display text-[14px] font-medium text-[#4FB3A9]">
                  {modal.query.variable}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#A9B1C6]">
                  Observation Window
                </div>
                <div className="mt-1 font-mono text-[13px] text-[#ffc20d] tabular-nums">
                  {modal.query.period}
                </div>
              </div>
            </div>

            {/* Layer Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
                    activeLayer === layer.id
                      ? 'bg-[#ffc20d] text-[#131D38] font-semibold'
                      : 'bg-[#1E2B52] text-[#A9B1C6] hover:text-[#f4f1ea]'
                  }`}
                >
                  {layer.number} · {layer.title}
                </button>
              ))}
            </div>

            {(() => {
              const current =
                WORKFLOW_LAYERS.find((l) => l.id === activeLayer) ?? WORKFLOW_LAYERS[0];
              return (
                <div className="rounded-[24px] bg-[#0B1224] border border-[#f4f1ea]/10 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-[18px] font-semibold text-[#f4f1ea]">
                      {current.question}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-[#4FB3A9]">
                      {current.datasetTag}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#A9B1C6]">
                    {current.explanation}
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#f4f1ea]/10">
                    <div>
                      <div className="font-mono text-[11px] uppercase text-[#A9B1C6]">
                        Diagnostic Output
                      </div>
                      <div className="mt-1 font-mono text-[14px] text-[#f4f1ea]">
                        Sen’s slope: — mm/yr (Placeholder pending verification)
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[11px] uppercase text-[#A9B1C6]">
                        Statistical Method
                      </div>
                      <div className="mt-1 font-mono text-[13px] text-[#ffc20d]">
                        {current.methodTag}
                      </div>
                    </div>
                  </div>
                  {current.caveat && (
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[#ffc20d]">
                      Note: {current.caveat}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* BODY: Discovery Card Detail */}
        {modal.type === 'discovery' && (
          <div className="mt-6 space-y-6">
            <div className="aspect-[16/9] rounded-[24px] overflow-hidden bg-[#0B1224]">
              <img
                src={modal.card.image}
                alt={modal.card.imageAlt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h4 className="font-display text-[20px] font-semibold text-[#f4f1ea]">
                {modal.card.detailHeadline}
              </h4>
              <p className="mt-2.5 text-[16px] leading-[1.6] text-[#A9B1C6]">
                {modal.card.detailBody}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {modal.card.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-[20px] bg-[#1E2B52] border border-[#f4f1ea]/10 p-4"
                >
                  <div className="font-mono text-[11px] uppercase text-[#A9B1C6]">{m.label}</div>
                  <div className="mt-1 text-[14px] font-medium text-[#f4f1ea]">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#f4f1ea]/10">
              <span className="font-mono text-[11px] uppercase text-[#4FB3A9]">
                Provenance: {modal.card.provenance}
              </span>
              <button
                type="button"
                onClick={() => onSwitchToInvestigation(modal.card.layerId)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
              >
                <span>Open in workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BODY: Methodology & Provenance */}
        {modal.type === 'methodology' && (
          <div className="mt-6 space-y-5 text-[15px] leading-[1.65] text-[#A9B1C6]">
            <div className="rounded-[20px] bg-[#1E2B52] p-5 border border-[#f4f1ea]/10">
              <h4 className="font-display text-[17px] font-semibold text-[#f4f1ea]">
                1. Non-parametric trend detection
              </h4>
              <p className="mt-2">
                Precipitation and convective intensity rarely follow Gaussian distributions.
                EarthSignal uses Theil-Sen median slopes and two-sided Mann-Kendall significance
                tests to resist outliers across 2001–2025 satellite time series.
              </p>
            </div>

            <div className="rounded-[20px] bg-[#1E2B52] p-5 border border-[#f4f1ea]/10">
              <h4 className="font-display text-[17px] font-semibold text-[#f4f1ea]">
                2. Dataset provenance & explicit uncertainty
              </h4>
              <p className="mt-2">
                Every chart records its exact source product (GPM IMERG v07B, MERRA-2, MODIS
                Collection 6.1, or ESA/JAXA EarthCARE), spatial resolution, seasonal window, and
                known retrieval limitations.
              </p>
            </div>

            <div className="rounded-[20px] bg-[#1E2B52] p-5 border border-[#f4f1ea]/10">
              <h4 className="font-display text-[17px] font-semibold text-[#f4f1ea]">
                3. Conditional scenarios, never forecasts
              </h4>
              <p className="mt-2">
                Projections in Layer 04 and Layer 05 represent bounded physical sensitivity pathways
                (stabilization, continuation, compounding stress)—never point predictions.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase text-[#4FB3A9]">
                <ShieldCheck className="w-4 h-4" />
                Open reproducible specification
              </span>
              <button
                type="button"
                onClick={() => onSwitchToInvestigation('detect')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
              >
                <span>Launch Sahel investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* BODY: Researcher Sign In */}
        {modal.type === 'signin' && (
          <div className="mt-6">
            {signInSuccess ? (
              <div className="rounded-[24px] bg-[#1E2B52] border border-[#4FB3A9]/40 p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#4FB3A9] mx-auto" />
                <h4 className="mt-3 font-display text-[20px] font-semibold text-[#f4f1ea]">
                  Notebook access link prepared
                </h4>
                <p className="mt-2 text-[15px] text-[#A9B1C6]">
                  Workspace session initialized for{' '}
                  <span className="text-[#f4f1ea] font-medium">{email}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => onSwitchToInvestigation('detect')}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold cursor-pointer"
                >
                  <span>Continue to workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <p className="text-[15px] text-[#A9B1C6]">
                  Save investigation bounding boxes, provenance exports, and Sahel diagnostic notes
                  across sessions.
                </p>

                <div>
                  <label
                    htmlFor="signin-email"
                    className="block font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-1.5"
                  >
                    Institutional or Research Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@university.edu"
                    className="w-full rounded-[16px] bg-[#0B1224] border border-[#f4f1ea]/20 px-4 py-3 text-[15px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none focus:border-[#ffc20d]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signin-org"
                    className="block font-mono text-[11px] uppercase tracking-wider text-[#A9B1C6] mb-1.5"
                  >
                    Laboratory / Organization (Optional)
                  </label>
                  <input
                    id="signin-org"
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Hydrology & Climate Lab"
                    className="w-full rounded-[16px] bg-[#0B1224] border border-[#f4f1ea]/20 px-4 py-3 text-[15px] text-[#f4f1ea] placeholder:text-[#5B6478] focus:outline-none focus:border-[#ffc20d]"
                  />
                </div>

                {signInError && (
                  <p className="text-[13px] text-[#ffc20d] font-medium">{signInError}</p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full border border-[#f4f1ea]/20 text-[14px] text-[#f4f1ea] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-full bg-[#ffc20d] text-[#131D38] text-[14px] font-semibold hover:bg-[#eab006] transition-colors cursor-pointer"
                  >
                    Request access
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
