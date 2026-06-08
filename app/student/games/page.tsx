import Link from 'next/link';
import { Gamepad2, Mic, Zap, Baby } from 'lucide-react';

const GAMES = [
  {
    icon: Gamepad2,
    label: 'Book Game',
    description: 'Test your knowledge of books and reading comprehension in a fun game format.',
    path: '/student/book-game',
    color: 'bg-green-50 text-green-600 group-hover:bg-green-100',
  },
  {
    icon: Mic,
    label: 'Pronunciation Game',
    description: 'Practise and improve your English pronunciation with interactive challenges.',
    path: '/student/pronunciation-game',
    color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
  },
  {
    icon: Zap,
    label: 'Quiz Battle',
    description: 'Race against classmates — fastest correct answer wins the round!',
    path: '/student/quiz-game',
    color: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100',
  },
  {
    icon: Baby,
    label: 'Nursery Game',
    description: 'Drag and drop alphabets and numbers into the right places — fun for little learners!',
    path: '/student/nursery-game',
    color: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
  },
];

export default function GamesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Games</h1>
        <p className="text-gray-500 text-sm mt-1">Pick a game and start playing</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map(({ icon: Icon, label, description, path, color }) => (
          <Link key={path} href={path}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-gray-200 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${color}`}>
              <Icon size={24} />
            </div>
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
