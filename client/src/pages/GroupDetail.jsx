import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groups, memos as memosApi, backup } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../utils/config';

export const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAdd, setShowAdd] = useState(false);
  
  const [newDueTime, setNewDueTime] = useState('');
  const [newAssignees, setNewAssignees] = useState([]);
  
  const [editingMemo, setEditingMemo] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editAssignees, setEditAssignees] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurringType, setNewRecurringType] = useState('daily');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [showMembers, setShowMembers] = useState(false);
  const [newMember, setNewMember] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const { socket, on, off } = useSocket(id);

  useEffect(() => {
    loadGroup();
    loadMemos();
  }, [id]);

  useEffect(() => {
    if (socket) {
      on('memo_created', (memo) => {
        setMemos((prev) => [memo, ...prev]);
      });
      on('memo_updated', (memo) => {
        setMemos((prev) => prev.map((m) => (m.id === memo.id ? memo : m)));
      });
      on('memo_deleted', ({ id }) => {
        setMemos((prev) => prev.filter((m) => m.id !== id));
      });
      on('memo_completed', (memo) => {
        setMemos((prev) => prev.map((m) => (m.id === memo.id ? memo : m)));
      });
      on('memo_uncompleted', (memo) => {
        setMemos((prev) => prev.map((m) => (m.id === memo.id ? memo : m)));
      });

      return () => {
        off('memo_created');
        off('memo_updated');
        off('memo_deleted');
        off('memo_completed');
        off('memo_uncompleted');
      };
    }
  }, [socket]);

  const loadGroup = async () => {
    try {
      const data = await groups.get(id);
      setGroup(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMemos = async () => {
    try {
      const data = await memosApi.getByGroup(id);
      setMemos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemo = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const memoData = {
        content: newContent,
        due_date: newDueDate || null,
        due_time: newDueTime || null,
        is_recurring: newIsRecurring,
        recurring_type: newIsRecurring ? newRecurringType : null,
        image_url: imageUrl || null,
        assignees: newAssignees.length > 0 ? JSON.stringify(newAssignees) : null,
      };
      await memosApi.create(id, memoData);
      setNewContent('');
      setNewDueDate('');
      setNewDueTime('');
      setNewAssignees([]);
      setNewIsRecurring(false);
      setImageUrl('');
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await response.json();
      setImageUrl(data.url);
    } catch (err) {
      setError('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async (memoId, isCompleted) => {
    try {
      if (isCompleted) {
        await memosApi.uncomplete(memoId);
      } else {
        await memosApi.complete(memoId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (memoId) => {
    if (!confirm('确定要删除这条备忘录吗？')) return;
    try {
      await memosApi.delete(memoId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (memo) => {
    setEditingMemo(memo);
    setEditContent(memo.content);
    setEditDueDate(memo.due_date || '');
    setEditDueTime(memo.due_time || '');
    try {
      setEditAssignees(memo.assignees ? JSON.parse(memo.assignees) : []);
    } catch {
      setEditAssignees([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await memosApi.update(editingMemo.id, {
        content: editContent,
        due_date: editDueDate || null,
        due_time: editDueTime || null,
        is_recurring: editingMemo.is_recurring,
        recurring_type: editingMemo.recurring_type,
        assignees: editAssignees.length > 0 ? JSON.stringify(editAssignees) : null,
      });
      setEditingMemo(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.trim()) return;

    setAddingMember(true);
    try {
      await groups.addMember(id, newMember);
      setNewMember('');
      loadGroup();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await backup.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoshare_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('导出失败');
    }
  };

  const pendingMemos = memos.filter((m) => !m.is_completed);
  const completedMemos = memos.filter((m) => m.is_completed);

  const formatDate = (date, time) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = '';
    if (d.toDateString() === today.toDateString()) dateStr = '今天';
    else if (d.toDateString() === tomorrow.toDateString()) dateStr = '明天';
    else dateStr = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    
    if (time) {
      return `${dateStr} ${time}`;
    }
    return dateStr;
  };

  const isOverdue = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-pink-500 transition">
              ← 返回
            </Link>
            <h1 className="text-xl font-semibold text-gray-800">{group?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(true)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              👥 {group?.members?.length || 0}
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              💾 备份
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-2">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full mb-6 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition text-left flex items-center gap-3 border border-gray-100"
        >
          <span className="text-2xl">➕</span>
          <span className="text-gray-400">添加新事项...</span>
        </button>

        {showAdd && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-100">
            <form onSubmit={handleAddMemo} className="space-y-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="输入事项内容..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none resize-none"
                rows={3}
                autoFocus
              />

              {imageUrl && (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="上传" className="max-h-32 rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition text-sm">
                  📷 添加图片
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>

                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                />

                <input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                />

                {group?.members && group.members.length > 0 && (
                  <select
                    multiple
                    value={newAssignees}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setNewAssignees(selected);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm min-w-[120px]"
                  >
                    {group.members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.nickname || member.username}
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newIsRecurring}
                    onChange={(e) => setNewIsRecurring(e.target.checked)}
                    className="rounded text-pink-500"
                  />
                  重复
                </label>

                {newIsRecurring && (
                  <select
                    value={newRecurringType}
                    onChange={(e) => setNewRecurringType(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                >
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setNewContent('');
                    setNewDueDate('');
                    setNewDueTime('');
                    setNewAssignees([]);
                    setImageUrl('');
                  }}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {pendingMemos.length === 0 && completedMemos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-gray-500">还没有事项</p>
            <p className="text-gray-400 text-sm">点击上方添加你的第一个事项</p>
          </div>
        ) : (
          <>
            {pendingMemos.length > 0 && (
              <div className="space-y-3 mb-8">
                {pendingMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${
                      isOverdue(memo.due_date) ? 'border-l-4 border-l-red-400' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleComplete(memo.id, memo.is_completed)}
                        className={`mt-1 w-6 h-6 rounded-full border-2 flex-shrink-0 transition ${
                          memo.is_completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-pink-400'
                        }`}
                      >
                        {memo.is_completed && <span className="text-white text-sm">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-gray-800 ${memo.is_completed ? 'line-through text-gray-400' : ''}`}>
                          {memo.content}
                        </p>
                        {memo.image_url && (
                          <img src={memo.image_url} alt="附件" className="mt-2 max-h-32 rounded-lg" />
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          {memo.due_date && (
                            <span className={isOverdue(memo.due_date) ? 'text-red-500' : ''}>
                              📅 {formatDate(memo.due_date, memo.due_time)}
                            </span>
                          )}
                          {memo.is_recurring === 1 && (
                            <span>🔄 {memo.recurring_type === 'daily' ? '每天' : memo.recurring_type === 'weekly' ? '每周' : '每月'}</span>
                          )}
                          <span>👤 {memo.creator_nickname || memo.creator_username}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(memo)}
                          className="text-gray-300 hover:text-pink-500 transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(memo.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completedMemos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  ✅ 已完成 ({completedMemos.length})
                </h3>
                <div className="space-y-2">
                  {completedMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100 opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleComplete(memo.id, memo.is_completed)}
                          className="mt-1 w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 flex-shrink-0"
                        >
                          <span className="text-white text-sm">✓</span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-400 line-through">{memo.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                            {memo.completer_nickname && <span>✓ 被 {memo.completer_nickname} 完成</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(memo.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">组成员</h3>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {group?.members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full flex items-center justify-center text-white text-sm">
                      {(member.nickname || member.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{member.nickname || member.username}</p>
                      <p className="text-xs text-gray-500">{member.role === 'owner' ? '组长' : '成员'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {group?.role === 'owner' && (
              <div className="p-4 border-t border-gray-100">
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <input
                    type="text"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    placeholder="输入用户名添加成员"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    type="submit"
                    disabled={addingMember || !newMember.trim()}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition disabled:opacity-50"
                  >
                    {addingMember ? '添加中...' : '添加'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {editingMemo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingMemo(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-4">编辑备忘录</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none resize-none"
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => setEditDueTime(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
              {group?.members && group.members.length > 0 && (
                <select
                  multiple
                  value={editAssignees}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setEditAssignees(selected);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm min-w-[120px]"
                >
                  {group.members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.nickname || member.username}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                保存
              </button>
              <button
                onClick={() => setEditingMemo(null)}
                className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
