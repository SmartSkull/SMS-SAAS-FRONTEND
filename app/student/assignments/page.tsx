'use client';

import { useState } from 'react';
import { CalendarDays, Download, FileText, UserRound, X } from 'lucide-react';
import { useAssignments } from '@/hooks/student';
import { EmptyState } from '@/components/ui/StateDisplay';
import type { Assignment } from '@/types';

function fileHref(path?: string) {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  return path.startsWith('/api') ? path : `/api/uploads/${path.replace(/^\/?(uploads\/)?/, '')}`;
}

function assignmentTitle(assignment: Assignment) {
  return assignment.title || assignment.subject || assignment.course || 'Assignment';
}

function assignmentBody(assignment: Assignment) {
  return assignment.assignment || assignment.description || assignment.content || '';
}

function assignmentFile(assignment: Assignment) {
  return assignment.file_url || assignment.file;
}

function assignmentDueDate(assignment: Assignment) {
  return assignment.due_date || assignment.deadline || assignment.dueAt;
}

function assignmentTeacher(assignment: Assignment) {
  const firstName = assignment.firstname;
  const lastName = assignment.lastname;
  return [firstName, lastName].filter(Boolean).join(' ') || 'Teacher';
}

function formatDate(date?: string) {
  if (!date) return 'No due date';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'No due date' : parsed.toLocaleDateString();
}

async function downloadFile(assignment: Assignment) {
  const file = assignmentFile(assignment);
  if (!file) return;

  const href = fileHref(file);
  const fallback = () => {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = assignmentTitle(assignment).replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '');
    const extension = new URL(href, window.location.href).pathname.split('.').pop();

    link.href = objectUrl;
    link.download = `${cleanName || 'assignment'}${extension && extension.length <= 5 ? `.${extension}` : ''}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    fallback();
  }
}

export default function StudentAssignments() {
  const { items, loading } = useAssignments();
  const [selected, setSelected] = useState<Assignment | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} message="No assignments yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              onClick={() => setSelected(assignment)}
              className="card w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-900">{assignmentTitle(assignment)}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {assignment.course || assignment.subject || 'Subject'} {assignment.class ? `- ${assignment.class}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">{assignmentBody(assignment)}</p>
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    Due: {formatDate(assignmentDueDate(assignment))}
                  </p>
                </div>
                {assignmentFile(assignment) && (
                  <span className="rounded-lg p-2 text-gray-400" aria-hidden="true">
                    <Download size={16} />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{assignmentTitle(selected)}</h2>
                <p className="mt-1 text-sm text-gray-500">{selected.course || selected.subject || 'Subject'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close assignment"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <CalendarDays size={18} className="text-amber-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Due date</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(assignmentDueDate(selected))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <UserRound size={18} className="text-blue-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Teacher</p>
                    <p className="text-sm font-semibold text-gray-900">{assignmentTeacher(selected)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">Assignment</p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {assignmentBody(selected) || 'No assignment details were provided.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {assignmentFile(selected) && (
                <button
                  type="button"
                  onClick={() => downloadFile(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Download size={16} />
                  Download file
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
