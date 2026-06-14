import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown, ArrowLeft } from 'lucide-react';
import { fetchAPI } from '@/api/client';

interface Ranking {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  title: string;
  certScore: number;
  certLevel: string | null;
  evaluatedAt: string;
}

const levelColors: Record<string, string> = {
  C3: '#c96442',
  C2: '#d97757',
  C1: '#7b9b6e',
};

export default function Leaderboard() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI<any>('/leaderboard?limit=50')
      .then((res: any) => {
        const data = res.data?.rankings || res.rankings || [];
        setRankings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="min-h-screen pb-12" style={{ background: '#f5f4ed' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 mb-4 text-sm" style={{ color: '#5e5d59' }}>
          <ArrowLeft size={16} /> 返回
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <Trophy size={28} style={{ color: '#c96442' }} />
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}>
            能力排行榜
          </h1>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#e8e6dc] border-t-[#c96442] rounded-full animate-spin" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-20">
            <i className="bi bi-trophy" style={{ fontSize: "40px", color: "#c96442" }} />
            <p className="text-sm" style={{ color: '#87867f' }}>还没有排行数据，成为第一个上榜的人！</p>
            <Link to="/trials" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#c96442' }}>
              开始试炼
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {top3.map((r, i) => {
                  const icon = i === 0 ? <Crown size={20} /> : <Medal size={20} />;
                  const colors = ['#c96442', '#7b9b6e', '#a89888'];
                  return (
                    <motion.div
                      key={r.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-xl p-4 text-center border"
                      style={{
                        background: '#faf9f5',
                        borderColor: '#e8e6dc',
                        borderTop: `3px solid ${colors[i]}`,
                      }}
                    >
                      <div className="flex justify-center mb-2" style={{ color: colors[i] }}>{icon}</div>
                      {r.userId === 'seed' ? (
                        <div className="block cursor-default">
                          <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white" style={{ background: colors[i] }}>
                            {r.displayName.slice(0, 2)}
                          </div>
                          <div className="text-sm font-medium truncate" style={{ color: '#141413' }}>{r.displayName}</div>
                          {r.title && <div className="text-xs truncate" style={{ color: '#87867f' }}>{r.title}</div>}
                        </div>
                      ) : (
                        <Link to={`/profile/${r.userId}`} className="block">
                          <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white" style={{ background: colors[i] }}>
                            {r.displayName.slice(0, 2)}
                          </div>
                          <div className="text-sm font-medium truncate" style={{ color: '#141413' }}>{r.displayName}</div>
                          {r.title && <div className="text-xs truncate" style={{ color: '#87867f' }}>{r.title}</div>}
                        </Link>
                      )}
                      <div className="text-lg font-bold mt-1" style={{ color: colors[i] }}>{r.certScore}</div>
                      {r.certLevel && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${levelColors[r.certLevel]}20`, color: levelColors[r.certLevel] }}>
                          {r.certLevel}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Rest of Rankings */}
            <div className="space-y-2">
              {rest.map((r, i) => (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {r.userId === 'seed' ? (
                    <div
                      className="flex items-center gap-4 rounded-lg px-4 py-3 border cursor-default"
                      style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}
                    >
                      <span className="text-sm font-bold w-6 text-center" style={{ color: '#87867f' }}>{r.rank}</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: r.certLevel ? levelColors[r.certLevel] || '#a89888' : '#a89888' }}>
                        {r.displayName.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#141413' }}>{r.displayName}</div>
                        {r.title && <div className="text-xs" style={{ color: '#87867f' }}>{r.title}</div>}
                      </div>
                      {r.certLevel && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${levelColors[r.certLevel]}20`, color: levelColors[r.certLevel] }}>
                          {r.certLevel}
                        </span>
                      )}
                      <span className="font-bold text-lg" style={{ color: '#c96442' }}>{r.certScore}</span>
                    </div>
                  ) : (
                    <Link
                      to={`/profile/${r.userId}`}
                      className="flex items-center gap-4 rounded-lg px-4 py-3 border hover:shadow-sm transition-shadow"
                      style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}
                    >
                      <span className="text-sm font-bold w-6 text-center" style={{ color: '#87867f' }}>{r.rank}</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: r.certLevel ? levelColors[r.certLevel] || '#a89888' : '#a89888' }}>
                        {r.displayName.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#141413' }}>{r.displayName}</div>
                        {r.title && <div className="text-xs" style={{ color: '#87867f' }}>{r.title}</div>}
                      </div>
                      {r.certLevel && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${levelColors[r.certLevel]}20`, color: levelColors[r.certLevel] }}>
                          {r.certLevel}
                        </span>
                      )}
                      <span className="font-bold text-lg" style={{ color: '#c96442' }}>{r.certScore}</span>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
