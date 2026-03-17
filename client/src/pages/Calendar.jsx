import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Calendar from 'react-calendar';
import { groups, memos as memosApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/config';
import 'react-calendar/dist/Calendar.css';

export const CalendarPage = () => {
  const [allMemos, setAllMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [groupList, setGroupList] = useState([]);
  const [showDateMemos, setShowDateMemos] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsData, allGroups] = await Promise.all([
        groups.getAll(),
        groups.getAll()
      ]);
      setGroupList(allGroups);
      
      const memosWithGroup = [];
      for (const group of groupsData) {
        const memos = await memosApi.getByGroup(group.id);
        memosWithGroup.push(...memos.map(m => ({
          ...m,
          groupName: group.name,
          groupColor: getGroupColor(group.id)
        })));
      }
      setAllMemos(memosWithGroup);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getGroupColor = (groupId) => {
    const colors = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    return colors[groupId % colors.length];
  };

  const getMemosForDate = (date) => {
    const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return allMemos.filter(memo => {
      if (!memo.due_date) return false;
      let dueDate = memo.due_date;
      if (dueDate.includes('T')) {
        dueDate = dueDate.split('T')[0];
      }
      
      if (memo.is_recurring) {
        if (memo.recurring_type === 'daily') return true;
        if (memo.recurring_type === 'weekly') {
          const memoDate = new Date(memo.due_date);
          return memoDate.getDay() === date.getDay();
        }
        if (memo.recurring_type === 'monthly') {
          return memoDate.getDate() === date.getDate();
        }
      }
      
      return dueDate === dateStr;
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const memos = getMemosForDate(date);
    if (memos.length === 0) return null;
    
    return (
      <div className="flex justify-center gap-1 mt-1">
        {memos.slice(0, 3).map((memo, idx) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-full ${memo.is_completed ? 'bg-green-400' : 'bg-pink-500'}`}
          />
        ))}
      </div>
    );
  };

  const selectedMemos = getMemosForDate(selectedDate);

  const handleComplete = async (memoId, isCompleted) => {
    try {
      if (isCompleted) {
        await memosApi.uncomplete(memoId);
      } else {
        await memosApi.complete(memoId);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            日历
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.nickname || user?.username}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-pink-500 transition"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={tileContent}
                locale="zh-CN"
                className="w-full"
              />
            </div>

            <div 
              className="bg-white rounded-xl shadow-sm p-4 cursor-pointer"
              onClick={() => setShowDateMemos(!showDateMemos)}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  {formatDate(selectedDate)}
                </h3>
                <span className="text-gray-400">
                  {showDateMemos ? '▲' : '▼'}
                </span>
              </div>
              
              {showDateMemos && (
                <div className="mt-4 space-y-3">
                  {selectedMemos.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">这一天没有事项</p>
                  ) : (
                    selectedMemos.map((memo) => (
                      <div
                        key={memo.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${memo.is_completed ? 'bg-gray-50' : 'bg-pink-50'}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(memo.id, memo.is_completed);
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition
                            ${memo.is_completed 
                              ? 'border-green-500 bg-green-500 text-white' 
                              : 'border-gray-300 hover:border-pink-500'}`}
                        >
                          {memo.is_completed && '✓'}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${memo.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {memo.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: memo.groupColor }}
                            >
                              {memo.groupName}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/group/${memo.group_id}`}
                          className="text-sm text-pink-500 hover:text-pink-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          查看
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <Link
            to="/"
            className={`flex-1 py-3 text-center flex flex-col items-center gap-1 ${
              location.pathname === '/' 
                ? 'text-pink-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs">备忘录</span>
          </Link>
          <Link
            to="/calendar"
            className={`flex-1 py-3 text-center flex flex-col items-center gap-1 ${
              location.pathname === '/calendar' 
                ? 'text-pink-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">📅</span>
            <span className="text-xs">日历</span>
          </Link>
          <div className="flex-1 py-3 text-center flex flex-col items-center gap-1 text-gray-400">
            <span className="text-xl">👤</span>
            <span className="text-xs">我的</span>
          </div>
        </div>
      </nav>
    </div>
  );
};
