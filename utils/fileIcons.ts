
import React from 'react';
import { Icons } from '../components/Icon';

const fileIcons: Record<string, React.FC<any>> = {
  js: Icons.JSIcon,
  jsx: Icons.ReactIcon,
  ts: Icons.TSIcon,
  tsx: Icons.ReactIcon,
  html: Icons.HTMLIcon,
  css: Icons.CSSIcon,
  json: Icons.JSONIcon,
  md: Icons.File,
};

export const getIconForFile = (filename: string): React.FC<any> => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return fileIcons[extension] || Icons.File;
};
