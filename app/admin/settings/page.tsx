'use client';
import { Save, Calendar, Trash2, Upload, X, UserCheck, PenLine, Users } from 'lucide-react';
import { useAdminSettings, useAdminSettingsConfig, type ClassTeacherSetting } from '@/hooks/admin';
import { useSchoolData } from '@/hooks/useSchoolData';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '@/lib/api';

export default function SettingsPage() {
  const { records, form, setForm, loading, saving, save, remove } = useAdminSettings();
  const { sessions, terms } = useSchoolData();
  const [confirmTarget, setConfirmTarget] = useState<{ session: string; term: string } | null>(null);

  const { config, loading: configLoading, saving: configSaving, uploading, save: saveConfig, uploadSignature, removeSignature } = useAdminSettingsConfig();

  // Principal state
  const [principal, setPrincipal] = useState('');

  // Class-teacher assignments (keyed by classId)
  const [classTeachers, setClassTeachers] = useState<Record<string, string | null>>({});

  // Signature upload
  const sigRef = useRef<HTMLInputElement>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);

  // Sync config → local state when loaded
  useEffect(() => {
    if (!config) return;
    setPrincipal(config.principal ?? '');
    const map: Record<string, string | null> = {};
    config.classes.forEach((c) => { map[c.id] = c.teacherUniqueId; });
    setClassTeachers(map);
  }, [config]);

  const handleSigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSigFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSigPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSigPreview(null);
    }
  };

  const handleSigUpload = async () => {
    if (!sigFile) return;
    await uploadSignature(sigFile);
    setSigFile(null);
    setSigPreview(null);
    if (sigRef.current) sigRef.current.value = '';
  };

  const handleSavePrincipalAndClasses = async () => {
    const classTeachersPayload = Object.entries(classTeachers).map(([classId, teacherUniqueId]) => ({
      classId,
      teacherUniqueId: teacherUniqueId ?? null,
    }));
    await saveConfig({ principal, classTeachers: classTeachersPayload });
  };

  const signatureUrl = sigPreview ?? (config?.signature ? getImageUrl(config.signature) : null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* ── School Days per Term ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl card shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-purple-600" />
          <h2 className="font-semibold text-gray-900">School Days per Term</h2>
        </div>

        {/* Add form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
            <select value={form.session} onChange={e => setForm(p => ({ ...p, session: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
              <option value="">Select session</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
            <select value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-white">
              <option value="">Select term</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Total Days</label>
            <input type="number" min={1} value={form.total_days} onChange={e => setForm(p => ({ ...p, total_days: e.target.value }))}
              placeholder="e.g. 65"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
          <Save size={16} /> {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Records table */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : records.length > 0 && (
          <table className="w-full text-sm mt-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Session</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Days</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => (
                <tr key={`${r.session}-${r.term}`} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-900">{r.session}</td>
                  <td className="p-3 text-gray-600">{r.term}</td>
                  <td className="p-3 text-gray-600">{r.totalDays}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setConfirmTarget({ session: r.session, term: r.term })} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Class Teacher Assignment ────────────────────────────────── */}
      <div className="bg-white rounded-2xl card shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Class Teacher Assignment</h2>
        </div>
        <p className="text-sm text-gray-500">Assign a class teacher to each class. This name will appear on student result sheets.</p>

        {configLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : config && config.classes.length > 0 ? (
          <div className="space-y-3">
            {config.classes.map((cls: ClassTeacherSetting) => (
              <div key={cls.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {cls.name}
                </div>
                <select
                  value={classTeachers[cls.id] ?? ''}
                  onChange={(e) => setClassTeachers((prev) => ({ ...prev, [cls.id]: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">— No teacher assigned —</option>
                  {config.staff.map((s) => (
                    <option key={s.uniqueId} value={s.uniqueId}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          !configLoading && <p className="text-sm text-gray-400">No classes found. Add classes first.</p>
        )}
      </div>

      {/* ── Principal ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl card shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <UserCheck size={20} className="text-green-600" />
          <h2 className="font-semibold text-gray-900">Principal</h2>
        </div>
        <p className="text-sm text-gray-500">The principal's name will appear on student result sheets.</p>

        {configLoading ? (
          <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Principal</label>
            <select
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              <option value="">— No principal assigned —</option>
              {(config?.staff ?? []).map((s) => (
                <option key={s.uniqueId} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Save Principal + Classes ───────────────────────────────── */}
      {!configLoading && (
        <div className="flex justify-end">
          <button
            onClick={handleSavePrincipalAndClasses}
            disabled={configSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {configSaving ? 'Saving…' : 'Save Principal & Class Teachers'}
          </button>
        </div>
      )}

      {/* ── Signature Upload ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl card shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <PenLine size={20} className="text-orange-500" />
          <h2 className="font-semibold text-gray-900">Principal's Signature</h2>
        </div>
        <p className="text-sm text-gray-500">Upload the principal's signature image. It will be displayed on approved result sheets.</p>

        {configLoading ? (
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-start gap-5">
              <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {signatureUrl ? (
                  <img src={signatureUrl} alt="Signature preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-gray-400">No signature uploaded</span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={sigRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSigFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sigRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    Choose File
                  </button>
                  {sigFile && (
                    <button
                      type="button"
                      onClick={() => { setSigFile(null); setSigPreview(null); if (sigRef.current) sigRef.current.value = ''; }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <X size={14} /> Clear
                    </button>
                  )}
                  {config?.signature && !sigFile && (
                    <button
                      type="button"
                      onClick={removeSignature}
                      disabled={configSaving}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Remove Signature
                    </button>
                  )}
                </div>
                {sigFile && (
                  <p className="text-xs text-gray-500">{sigFile.name}</p>
                )}
                {sigFile && (
                  <button
                    type="button"
                    onClick={handleSigUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploading ? 'Uploading…' : 'Upload Signature'}
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Recommended: PNG with transparent background, under 2 MB.
            </p>
          </div>
        )}
      </div>

      {confirmTarget && (
        <ConfirmModal
          message={`Delete school days for ${confirmTarget.session} – ${confirmTarget.term}?`}
          onConfirm={() => { remove(confirmTarget.session, confirmTarget.term); setConfirmTarget(null); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
