'use client';

import Empty from '/components/empty';

const Error = ({ message = 'An unknown error occurred' } = {}) => (
  <Empty>{message}</Empty>
);

export default Error;
