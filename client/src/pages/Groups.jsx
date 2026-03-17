import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { groups, auth } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const Groups = () => {
  const [groupList, setGroupList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [email, setEmail] = useState('');
  const [emailReminder, setEmailReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('both');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setEmailReminder(user.email_reminder !== 0);
      setReminderTime(user.reminder_time || 'both');
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      const data = await groups.getAll();
      setGroupList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newGroup = await groups.create(newGroupName);
      setGroupList([newGroup, ...groupList]);
      setShowCreate(false);
      setNewGroupName('');
      navigate(`/group/${newGroup.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await auth.updateProfile({ 
        email, 
        email_reminder: emailReminder ? 1 : 0,
        reminder_time: reminderTime 
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pb-20">
      {showProfile ? (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">个人设置</h2>
            <button
              onClick={() => setShowProfile(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 返回
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-4">账号信息</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">用户名</p>
                <p className="text-gray-800 font-medium">{user?.username}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <h3 className="font-medium text-gray-800 mb-4">邮件提醒设置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">邮箱地址</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="用于接收任务提醒邮件"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700">开启邮件提醒</span>
                  <button
                    type="button"
                    onClick={() => setEmailReminder(!emailReminder)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      emailReminder ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        emailReminder ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {emailReminder && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">提醒时间</label>
                    <select
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                    >
                      <option value="both">截止前一天 & 当天早上</option>
                      <option value="day_before">截止前一天早上</option>
                      <option value="day_of">截止当天早上</option>
                      <option value="15min">15分钟前</option>
                      <option value="30min">30分钟前</option>
                      <option value="1h">1小时前</option>
                      <option value="2h">2小时前</option>
                      <option value="morning">当天早上9点</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {reminderTime === 'both' && '将在截止前一天和当天早上8点发送提醒'}
                      {reminderTime === 'day_before' && '将在截止前一天早上8点发送提醒'}
                      {reminderTime === 'day_of' && '将在截止当天早上8点发送提醒'}
                      {reminderTime === '15min' && '将在截止前15分钟发送提醒'}
                      {reminderTime === '30min' && '将在截止前30分钟发送提醒'}
                      {reminderTime === '1h' && '将在截止前1小时发送提醒'}
                      {reminderTime === '2h' && '将在截止前2小时发送提醒'}
                      {reminderTime === 'morning' && '将在当天早上8点发送提醒'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-medium rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存设置'}
                </button>

                {saveSuccess && (
                  <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-center text-sm">
                    ✓ 保存成功
                  </div>
                )}
              </div>
            </form>

            <div className="pt-4 border-t">
              <button
                onClick={logout}
                className="w-full py-3 text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                MemoShare
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">{user?.nickname || user?.username}</span>
                <button
                  onClick={() => setShowProfile(true)}
                  className="text-sm text-gray-500 hover:text-pink-500 transition"
                >
                  设置
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">我的备忘录组</h2>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
              >
                <span>+</span> 创建新组
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {showCreate && (
              <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <form onSubmit={handleCreate} className="flex gap-3">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="输入组名称，如：我们的备忘录"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={creating || !newGroupName.trim()}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                  >
                    取消
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : groupList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 mb-4">还没有备忘录组</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-pink-500 hover:text-pink-600"
                >
                  创建第一个备忘录组
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groupList.map((group) => (
                  <Link
                    key={group.id}
                    to={`/group/${group.id}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 border border-gray-100"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{group.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>👥 {group.member_count} 人</span>
                      <span>📋 {group.pending_count} 待办</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto flex">
          <Link
            to="/"
            className={`flex-1 py-3 text-center flex flex-col items-center gap-1 ${
              location.pathname === '/' && !showProfile
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
          <button
            onClick={() => setShowProfile(true)}
            className={`flex-1 py-3 text-center flex flex-col items-center gap-1 ${
              showProfile
                ? 'text-pink-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">👤</span>
            <span className="text-xs">我的</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
