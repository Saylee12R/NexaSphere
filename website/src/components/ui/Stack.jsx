import React from 'react';

export const Stack = ({
  children,
  direction = 'column',
  gap = '16px',
  align = 'stretch',
  justify = 'flex-start',
  style = {},
  ...props
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Stack;
