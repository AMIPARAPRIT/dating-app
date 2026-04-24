import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function LikedChatPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?._id || !userId) return;
    // Build the virtual like-chat ID (sorted so both users get same ID)
    const ids = [user._id.toString(), userId].sort();
    const virtualId = `like_${ids[0]}_${ids[1]}`;
    navigate(`/chat/${virtualId}`, { replace: true });
  }, [user, userId, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
