import React from 'react'

const Test = () => {
  return (
    <div>
      <h1>Test</h1>
      {true && (
        <div>
          <p>Content</p>
        </div>
      )}
    </div>
  )
}

export default Test