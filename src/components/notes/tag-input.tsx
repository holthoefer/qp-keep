'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Sparkles, Loader2, Plus } from 'lucide-react';
import { getAiTags } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";

interface TagInputProps {
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  noteContent: string;
}

export function TagInput({ tags, setTags, noteContent }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const addTag = (tag: string) => {
    const newTag = tag.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestTags = async () => {
    setIsSuggesting(true);
    const result = await getAiTags(noteContent);
    
    if (result.tags) {
      const uniqueNewTags = result.tags.filter(t => !tags.includes(t));
      if (uniqueNewTags.length > 0) {
        setTags([...tags, ...uniqueNewTags]);
        toast({
            title: "Tags Suggested",
            description: `Added ${uniqueNewTags.length} new tag(s).`,
        });
      } else {
        toast({
            title: "No New Tags",
            description: "AI suggestions are already included.",
        });
      }
    } else if (result.error) {
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: result.error,
      });
    }
    setIsSuggesting(false);
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-sm">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Add a tag..."
          className="bg-transparent"
        />
        <Button variant="outline" type="button" onClick={() => addTag(inputValue)} disabled={!inputValue.trim()}>
          <Plus />
          Add Tag
        </Button>
        <Button variant="outline" type="button" onClick={handleSuggestTags} disabled={isSuggesting || noteContent.trim().length < 10}>
          {isSuggesting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          Suggest Tags
        </Button>
      </div>
    </div>
  );
}
