import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/Card.jsx';
import { Button } from '../../components/Button.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { CategoryIcon } from '../../components/CategoryIcon.jsx';
import { SkeletonBlock } from '../../components/Skeleton.jsx';
import { AuthBackdrop } from '../../components/AuthBackdrop.jsx';
import { Wordmark } from '../../components/Wordmark.jsx';
import { humanizeCategory } from '../../lib/humanize.js';
import * as workersApi from '../../api/workers.api.js';

// Same photo/overlay/fade + glass-card look AuthScreen.jsx uses for Login/
// Signup/ForgotPassword (worker onboarding is a direct continuation of
// signup - see postAuthRedirect.js) - deliberately NOT AuthScreen itself
// though, since that owns the whole viewport with no nav chrome, and
// onboarding needs AppShell's restricted (Help+Logout) nav still visible
// around it. `flex-1` fills the height AppShell's wrapper already owns,
// same sizing contract Screen.jsx's fillHeight={false} uses.
// No `isolate` here (unlike AuthScreen.jsx's otherwise-identical wrapper):
// isolation would trap AuthBackdrop's now-`fixed` layers inside this box's
// own local stacking context, so their explicit `-z-10` would only be
// compared against the glass card, not against AppShell's Sidebar - and
// the whole trapped context would still paint as one unit after Sidebar
// in DOM order, right back to the sidebar-hiding regression this was
// written around. AuthScreen.jsx keeps `isolate` since it never sits
// beside a Sidebar sibling, so the same trap never surfaces there.
function OnboardingBackdrop({ children }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-8">
      <AuthBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex w-full max-w-lg flex-col rounded-3xl border border-glass-border bg-glass-surface p-6 shadow-neu-card backdrop-blur-xl sm:p-8"
      >
        <Wordmark className="mx-auto mb-6" />
        {children}
      </motion.div>
    </div>
  );
}

// Local step numbering for the header only - Step 1 ("Personal details")
// already happened at Signup, so this flow starts numbering at 1 for
// itself (STEP_LABELS[0] = "Your work" = the business plan's Step 2, etc).
const STEP_LABELS = ['Your work', 'Documents', 'Review & submit', 'Application status'];
const WORK_SUBSTEPS = ['district', 'category', 'services'];

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 19 8 12l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Persistent onboarding header (Steps 2-4): back arrow + step indicator
// inside the card, identical on every screen. The bottom-nav/sidebar
// restriction (Help + Logout only) lives in AppShell/BottomNav/Sidebar,
// not here - this is just the in-card chrome.
function OnboardingHeader({ stepIndex, subStepIndex, onBack, showBack }) {
  return (
    <div className="mb-6">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-text-muted"
        >
          <BackIcon />
        </button>
      ) : (
        <div className="h-9" />
      )}
      <p className="mt-1 text-sm font-semibold text-text-muted">
        Step {stepIndex + 1} of {STEP_LABELS.length}: {STEP_LABELS[stepIndex]}
      </p>
      {stepIndex === 0 && (
        <div className="mt-2 flex gap-1.5">
          {WORK_SUBSTEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= subStepIndex ? 'bg-brand-solid' : 'bg-surface-alt'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkerApply() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [wasRejected, setWasRejected] = useState(false);

  // step: 0 = Your work, 1 = Documents, 2 = Review & submit, 3 = Application status
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState('district');

  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [catalog, setCatalog] = useState([]); // this category's services, with price-band hints
  const [selected, setSelected] = useState({}); // { [serviceId]: price string }

  const [bio, setBio] = useState('');
  const [documents, setDocuments] = useState({
    citizenshipFront: null,
    citizenshipBack: null,
    profilePhoto: null,
    skillCertificate: null,
  });

  const [error, setError] = useState('');
  const [savingWork, setSavingWork] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Resume-from-last-completed-step: a worker who already saved district +
  // services (Step 2 complete) skips straight to Documents; a still-
  // pending worker lands on the Application status screen; otherwise start
  // fresh at 2a. File-picker state can never survive a refresh on any
  // platform, so Documents/Review are never resumed into directly - only
  // Step 2's district+services early-save is a real persistence checkpoint.
  useEffect(() => {
    Promise.all([workersApi.getMyWorkerData(), workersApi.getDistricts(), workersApi.getCategories()])
      .then(([data, districtsRes, categoriesRes]) => {
        setDistricts(districtsRes.districts);
        setCategories(categoriesRes.categories);
        setWasRejected(data.profile.verificationStatus === 'rejected');

        if (data.profile.verificationStatus === 'pending') {
          setStep(3);
        } else if (!data.profile.district || data.services.length === 0) {
          setStep(0);
          setSubStep('district');
        } else {
          setDistrict(data.profile.district);
          setCategory(data.services[0].category);
          setSelected(Object.fromEntries(data.services.map((s) => [s.serviceId, String(s.price)])));
          setStep(1);
        }
      })
      .catch(() => setLoadError('Could not load your application. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // The chosen category's services (with band hints) - needed both for
  // Step 2c's pricing screen and to know whether skill_certificate is
  // required at Step 3, regardless of which of those two ways we arrived
  // at a category (freshly picked, or resumed from saved data).
  useEffect(() => {
    if (!category) return;
    workersApi
      .getServiceCatalog(category)
      .then(({ services }) => setCatalog(services))
      .catch(() => {});
  }, [category]);

  const needsSkillCertificate = catalog.some((s) => selected[s.id] !== undefined && s.highRisk);

  function goBack() {
    setError('');
    if (step === 0) {
      if (subStep === 'services') setSubStep('category');
      else if (subStep === 'category') setSubStep('district');
    } else if (step === 1) {
      setStep(0);
      setSubStep('services');
    } else if (step === 2) {
      setStep(1);
    }
  }

  function editSection(targetStep, targetSubStep) {
    setError('');
    setStep(targetStep);
    if (targetSubStep) setSubStep(targetSubStep);
  }

  function selectDistrict(name) {
    setDistrict(name);
    setSubStep('category');
  }

  function selectCategory(cat) {
    setCategory(cat);
    setSelected({});
    setSubStep('services');
  }

  function toggleService(id) {
    setSelected((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = '';
      return next;
    });
  }

  function setPrice(id, price) {
    setSelected((prev) => ({ ...prev, [id]: price }));
  }

  // The band is a hard floor/ceiling, not just the "Typical: Rs. X-Y" hint
  // it's also shown as - min/max come from the same admin-set,
  // per-service data (platform_settings.service_price_bands, via
  // getServiceCatalog's minPrice/maxPrice) that already renders that hint,
  // never a hardcoded range. Exactly the min or max is valid; only
  // strictly outside it is rejected. Mirrors the backend's own check in
  // workers.service.js saveOnboardingWork, which is the actual
  // enforcement - this is just so the worker sees it before submitting
  // rather than only as a server error afterward.
  function priceRangeError(service, price) {
    if (service.minPrice == null || service.maxPrice == null) return null;
    const num = Number(price);
    if (!price || Number.isNaN(num)) return null;
    if (num < service.minPrice || num > service.maxPrice) {
      return `Price must be between Rs. ${service.minPrice} and Rs. ${service.maxPrice} for this service.`;
    }
    return null;
  }

  async function confirmServices() {
    setError('');
    const entries = Object.entries(selected);
    if (entries.length === 0) return setError('Choose at least one service you offer.');
    if (entries.some(([, price]) => !price || Number(price) <= 0)) {
      return setError('Set a price for every service you selected.');
    }
    const outOfRange = entries.some(([serviceId, price]) => {
      const service = catalog.find((s) => s.id === Number(serviceId));
      return service && priceRangeError(service, price);
    });
    if (outOfRange) {
      return setError('Fix the out-of-range price(s) below before continuing.');
    }
    setSavingWork(true);
    try {
      const services = entries.map(([serviceId, price]) => ({ serviceId: Number(serviceId), price: Number(price) }));
      await workersApi.saveOnboardingWork({ district, services });
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingWork(false);
    }
  }

  function confirmDocuments() {
    setError('');
    if (!documents.citizenshipFront || !documents.citizenshipBack) {
      return setError('Citizenship photos (front and back) are required.');
    }
    if (!documents.profilePhoto) {
      return setError('A profile photo is required.');
    }
    if (needsSkillCertificate && !documents.skillCertificate) {
      return setError('A skill certificate is required for this category.');
    }
    setStep(2);
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await workersApi.apply({ bio, documents });
      setSubmitted(true);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <OnboardingBackdrop>
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="mt-4 h-40 w-full rounded-2xl" />
        <SkeletonBlock className="mt-3 h-40 w-full rounded-2xl" />
      </OnboardingBackdrop>
    );
  }

  if (loadError) {
    return (
      <OnboardingBackdrop>
        <p className="text-sm text-danger">{loadError}</p>
      </OnboardingBackdrop>
    );
  }

  return (
    <OnboardingBackdrop>
      <OnboardingHeader
        stepIndex={step}
        subStepIndex={WORK_SUBSTEPS.indexOf(subStep)}
        onBack={goBack}
        showBack={step < 3 && !(step === 0 && subStep === 'district')}
      />

      {step === 0 && subStep === 'district' && (
        <div>
          <h1 className="text-xl font-bold">Where do you work?</h1>
          <p className="mt-1 text-text-muted">Choose your district. You'll only be matched with bookings there.</p>
          <label className="mt-6 flex flex-col gap-1.5 text-sm font-medium text-text-muted">
            District
            <span className="relative">
              <select
                value={district}
                onChange={(e) => selectDistrict(e.target.value)}
                className="w-full appearance-none rounded-md border border-border bg-surface px-4 py-3 pr-10 text-base text-text outline-none focus:border-brand-solid"
              >
                <option value="" disabled>
                  Select your district
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
          {/* Data-driven, not hardcoded - reads straight off the same
              `districts` list the <select> is populated from, so it
              always matches whatever districts.is_active currently
              allows (see workers.model.js listDistricts). */}
          {districts.length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              More areas expanding soon — currently available in: {districts.map((d) => d.name).join(', ')}.
            </p>
          )}
        </div>
      )}

      {step === 0 && subStep === 'category' && (
        <div>
          <h1 className="text-xl font-bold">What do you do?</h1>
          <p className="mt-1 text-text-muted">Pick the category that best fits your work.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((cat) => (
              <Card
                key={cat}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectCategory(cat)}
                className="cursor-pointer"
              >
                <CategoryIcon category={cat} />
                <p className="mt-2 font-semibold">{humanizeCategory(cat)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 0 && subStep === 'services' && (
        <div>
          <h1 className="text-xl font-bold">Your services & pricing</h1>
          <p className="mt-1 text-text-muted">Select what you offer under {humanizeCategory(category)} and set your price.</p>
          <div className="mt-6 flex flex-col gap-3">
            {catalog.map((service) => {
              const checked = service.id in selected;
              const rangeError = checked ? priceRangeError(service, selected[service.id]) : null;
              return (
                <div key={service.id} className="rounded-2xl bg-surface-alt p-4 shadow-neu-inset">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(service.id)}
                        className="h-5 w-5 shrink-0 accent-brand-solid"
                      />
                      <span>
                        <span className="block">{service.name}</span>
                        {(service.minPrice != null || service.maxPrice != null) && (
                          <span className="block text-xs text-text-muted">
                            Typical: Rs. {service.minPrice}&ndash;{service.maxPrice}
                          </span>
                        )}
                      </span>
                    </label>
                    {checked && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Price (Rs.)"
                        value={selected[service.id]}
                        onChange={(e) => setPrice(service.id, e.target.value)}
                        className="w-28 shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-right text-text outline-none placeholder:text-text-muted"
                      />
                    )}
                  </div>
                  {rangeError && <p className="mt-2 text-xs text-danger">{rangeError}</p>}
                </div>
              );
            })}
            {catalog.length === 0 && <p className="text-sm text-text-muted">Loading services...</p>}
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <Button onClick={confirmServices} disabled={savingWork} className="mt-6 w-full">
            {savingWork ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="text-xl font-bold">Documents</h1>
          {wasRejected && (
            <p className="mt-1 text-sm text-danger">
              Your previous application was rejected. Please resubmit with clearer documents.
            </p>
          )}
          <p className="mt-1 text-text-muted">We use these to verify your identity before you go live.</p>

          <div className="mt-6 flex flex-col gap-4">
            <FileField
              label="Citizenship - front (required)"
              value={documents.citizenshipFront}
              onChange={(file) => setDocuments((prev) => ({ ...prev, citizenshipFront: file }))}
            />
            <FileField
              label="Citizenship - back (required)"
              value={documents.citizenshipBack}
              onChange={(file) => setDocuments((prev) => ({ ...prev, citizenshipBack: file }))}
            />
            <ProfilePhotoField
              value={documents.profilePhoto}
              onChange={(file) => setDocuments((prev) => ({ ...prev, profilePhoto: file }))}
            />
            {needsSkillCertificate && (
              <FileField
                label="Skill certificate (required for this category)"
                value={documents.skillCertificate}
                onChange={(file) => setDocuments((prev) => ({ ...prev, skillCertificate: file }))}
              />
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-muted">Tell customers about yourself (optional)</span>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="rounded-md border border-border bg-surface px-4 py-3 text-text outline-none"
              />
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <Button onClick={confirmDocuments} className="mt-6 w-full">
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-xl font-bold">Review & submit</h1>
          <p className="mt-1 text-text-muted">Make sure everything looks right before you submit.</p>

          <div className="mt-6 flex flex-col gap-3">
            <ReviewSection title="District" onEdit={() => editSection(0, 'district')}>
              <p>{district}</p>
            </ReviewSection>

            <ReviewSection title="Category" onEdit={() => editSection(0, 'category')}>
              <p>{humanizeCategory(category)}</p>
            </ReviewSection>

            <ReviewSection title="Services & pricing" onEdit={() => editSection(0, 'services')}>
              <ul className="flex flex-col gap-1">
                {Object.entries(selected).map(([serviceId, price]) => {
                  const service = catalog.find((s) => String(s.id) === String(serviceId));
                  return (
                    <li key={serviceId} className="flex items-center justify-between">
                      <span>{service?.name ?? `Service #${serviceId}`}</span>
                      <span className="font-semibold">Rs. {price}</span>
                    </li>
                  );
                })}
              </ul>
            </ReviewSection>

            <ReviewSection title="Documents" onEdit={() => editSection(1)}>
              <ul className="flex flex-col gap-1 text-text-muted">
                <li>Citizenship (front): {documents.citizenshipFront?.name ?? 'Not uploaded'}</li>
                <li>Citizenship (back): {documents.citizenshipBack?.name ?? 'Not uploaded'}</li>
                <li>Profile photo: {documents.profilePhoto?.name ?? 'Not uploaded'}</li>
                {needsSkillCertificate && <li>Skill certificate: {documents.skillCertificate?.name ?? 'Not uploaded'}</li>}
              </ul>
            </ReviewSection>
          </div>

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <Button onClick={handleSubmit} disabled={submitting} className="mt-6 w-full">
            {submitting ? 'Submitting...' : 'Submit application'}
          </Button>
        </div>
      )}

      {step === 3 && <PendingStatus justSubmitted={submitted} onOpenHelp={() => navigate('/help')} />}
    </OnboardingBackdrop>
  );
}

function ReviewSection({ title, onEdit, children }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-brand-solid">
          Edit
        </button>
      </div>
      <div className="mt-2 text-sm">{children}</div>
    </Card>
  );
}

function FileField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="rounded-md border border-border bg-surface px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-text-onBrand"
      />
      {value && <span className="text-xs text-success">{value.name} selected</span>}
    </label>
  );
}

// Both live camera capture and gallery upload, per the spec - two
// separate inputs writing to the same file value (no face-matching against
// the citizenship ID; that's a backlog idea, out of scope here). Both
// inputs are `hidden` (the visible "buttons" are their <label>s), which
// means the browser never gets to render its own native selected-file
// thumbnail the way it does for FileField's citizenship inputs above
// (those stay visible, just styled via the `file:` pseudo-class) - so
// this one needs its own preview, built the same way Profile.jsx's photo
// upload eventually renders one (the Avatar component), just from a local
// object URL since this file isn't uploaded until final submit.
function ProfilePhotoField({ value, onChange }) {
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  // Revocation only - the URL itself is derived synchronously above so
  // swapping files never has one stale render showing the old preview.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-muted">Profile photo (required)</span>
      <div className="flex gap-3">
        <label className="flex-1 cursor-pointer rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-medium">
          Take photo
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <label className="flex-1 cursor-pointer rounded-md border border-border bg-surface px-4 py-3 text-center text-sm font-medium">
          Choose from gallery
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      </div>
      {value && (
        <div className="flex items-center gap-2">
          <Avatar imageUrl={previewUrl} name={value.name} size={40} />
          <span className="text-xs text-success">{value.name} selected</span>
        </div>
      )}
    </div>
  );
}

// Step 5 - shown right after submit and on every future login while still
// pending (postAuthRedirect.js routes 'pending' workers here).
function PendingStatus({ justSubmitted, onOpenHelp }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Badge tone="warning" className="text-sm">
          Pending verification
        </Badge>
        <h1 className="mt-4 text-xl font-bold">
          {justSubmitted ? "You're all set!" : "We're reviewing your application"}
        </h1>
        <p className="mt-2 text-text-muted">
          Our team is checking your documents. This usually takes 1-2 business days.
        </p>
      </div>

      <Card className="mt-6">
        <p className="font-semibold">What happens next</p>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-text-muted">
          <li>1. We review your documents and pricing.</li>
          <li>2. We'll schedule a short in-person meeting and skill check.</li>
          <li>3. Once approved, you'll go live and start receiving bookings.</li>
        </ul>
      </Card>

      <Button variant="secondary" onClick={onOpenHelp} className="mt-6 w-full">
        Need help? Contact support
      </Button>
    </div>
  );
}
