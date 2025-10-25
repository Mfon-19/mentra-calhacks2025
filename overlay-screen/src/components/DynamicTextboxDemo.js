import React, { useState } from 'react';
import DynamicTextbox from './DynamicTextbox';

const DynamicTextboxDemo = () => {
  const [text, setText] = useState('');

  return (
    <div style={{ padding: '20px' }}>
      <DynamicTextbox
        text={text}
        onTextChange={setText}
        placeholder="Type something..."
        maxWidth={400}
        minHeight={40}
        maxHeight={200}
      />
    </div>
  );
};

export default DynamicTextboxDemo;
