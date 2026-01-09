import { useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      
      // Check if input contains commas for mass import
      if (input.includes(',')) {
        const newTags = input
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0 && !tags.includes(tag))
        
        if (newTags.length > 0) {
          onChange([...tags, ...newTags])
        }
      } else {
        // Single tag
        if (!tags.includes(input.trim())) {
          onChange([...tags, input.trim()])
        }
      }
      setInput('')
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] outline-none text-sm py-1"
      />
    </div>
  )
}
