import React, { useState, useEffect, useRef } from 'react';
import './DynamicTextbox.css';

const DynamicTextbox = ({ 
  initialText = '', 
  placeholder = 'Type something...', 
  maxWidth = 300,
  minHeight = 40,
  maxHeight = 200,
  onTextChange,
  onBlur,
  className = '',
  ...props 
}) => {
  const [text, setText] = useState(initialText);
  const [isVisible, setIsVisible] = useState(false);
  const textareaRef = useRef(null);
  const hiddenDivRef = useRef(null);

  // Auto-resize functionality
  const adjustHeight = () => {
    if (textareaRef.current && hiddenDivRef.current) {
      const textarea = textareaRef.current;
      const hiddenDiv = hiddenDivRef.current;
      
      // Copy text and styles to hidden div
      hiddenDiv.textContent = textarea.value;
      hiddenDiv.style.width = `${maxWidth}px`;
      
      // Get the computed height
      const scrollHeight = hiddenDiv.scrollHeight;
      
      // Apply height constraints
      const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Adjust height when text changes
  useEffect(() => {
    adjustHeight();
  }, [text, maxWidth, minHeight, maxHeight]);

  // Show textbox when text is not empty
  useEffect(() => {
    setIsVisible(text.length > 0);
  }, [text]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onTextChange?.(newText);
  };

  const handleBlur = (e) => {
    onBlur?.(e);
    // Hide if empty
    if (text.trim() === '') {
      setIsVisible(false);
    }
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleKeyDown = (e) => {
    // Hide on Escape
    if (e.key === 'Escape') {
      setText('');
      setIsVisible(false);
      textareaRef.current?.blur();
    }
  };

  return (
    <div className={`dynamic-textbox-container ${className}`}>
      {/* Hidden div for measuring text height */}
      <div
        ref={hiddenDivRef}
        className="dynamic-textbox-hidden"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'hidden',
          width: `${maxWidth}px`,
          fontSize: 'inherit',
          fontFamily: 'inherit',
          lineHeight: 'inherit',
          padding: 'inherit',
          border: 'inherit',
          boxSizing: 'border-box'
        }}
      />
      
      {/* Main textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={isVisible ? placeholder : ''}
        className={`dynamic-textbox ${isVisible ? 'visible' : ''}`}
        style={{
          width: `${maxWidth}px`,
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          resize: 'none',
          overflow: 'hidden'
        }}
        {...props}
      />
    </div>
  );
};

export default DynamicTextbox;
