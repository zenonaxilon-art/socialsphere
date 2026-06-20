import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Smile, MapPin } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function CreatePostModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, addPost } = useAppStore();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;

    setIsSubmitting(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addPost(content, imageUrl);
    setContent('');
    setImageUrl('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-zinc-800 shadow-2xl rounded-3xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Create new post</h2>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex space-x-3 mb-4">
                <img 
                  src={currentUser?.avatarUrl} 
                  alt={currentUser?.username} 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <span className="font-semibold">{currentUser?.username}</span>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg mt-2 placeholder:text-muted-foreground outline-none min-h-[100px]"
                  />
                </div>
              </div>

              {imageUrl && (
                <div className="relative mb-4 rounded-xl overflow-hidden bg-secondary">
                  <img src={imageUrl} alt="Upload preview" className="w-full h-auto max-h-[300px] object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <button 
                    type="button"
                    onClick={() => {
                      const url = prompt("Enter image URL (mock upload)");
                      if (url) setImageUrl(url);
                    }}
                    className="p-2 hover:text-primary hover:bg-secondary rounded-full transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 hover:text-primary hover:bg-secondary rounded-full transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 hover:text-primary hover:bg-secondary rounded-full transition-colors">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={(!content.trim() && !imageUrl) || isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
