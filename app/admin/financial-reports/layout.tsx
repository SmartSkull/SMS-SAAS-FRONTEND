'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';

export default function FinancialReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Reports', href: '/admin/financial-reports', icon: BarChart3 },
    { name: 'Income', href: '/admin/financial-reports/income', icon: ArrowUpCircle },
    { name: 'Expenses', href: '/admin/financial-reports/expenses', icon: ArrowDownCircle },
    { name: 'Outstanding Debts', href: '/admin/financial-reports/debts', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and view the school's financial health.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${isActive 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
