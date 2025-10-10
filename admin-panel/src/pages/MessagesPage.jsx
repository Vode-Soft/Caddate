import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { messagesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, [page, rowsPerPage]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await messagesAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
      });
      
      setMessages(response.data.messages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Mesajlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Mesaj Yönetimi
      </Typography>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Gönderen</TableCell>
                <TableCell>Alıcı</TableCell>
                <TableCell>Mesaj</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Tarih</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {message.sender_first_name} {message.sender_last_name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {message.sender_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {message.receiver_first_name} {message.receiver_last_name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {message.receiver_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {message.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={message.message_type} size="small" />
                  </TableCell>
                  <TableCell>
                    {message.is_read ? (
                      <Chip label="Okundu" color="success" size="small" />
                    ) : (
                      <Chip label="Okunmadı" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>
    </Box>
  );
}

