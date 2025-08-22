
import React from 'react';
import { getIconForFile } from '../utils/fileIcons';

interface FileIconProps {
  filename: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, className }) => {
  const IconComponent = getIconForFile(filename);
  return <IconComponent className={className} />;
};
