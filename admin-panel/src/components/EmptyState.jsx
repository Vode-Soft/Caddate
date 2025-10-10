import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';

export default function EmptyState({ 
  icon: Icon = InboxIcon, 
  title = 'Veri bulunamadı', 
  description = 'Henüz gösterilecek bir şey yok',
  action 
}) {
  return (
    <Paper 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        backgroundColor: '#fafafa'
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: '#e3f2fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          mb: 3
        }}
      >
        <Icon sx={{ fontSize: 40, color: '#1976d2' }} />
      </Box>
      
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      
      {action}
    </Paper>
  );
}

