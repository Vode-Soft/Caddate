import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { photosAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function PhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [page]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await photosAPI.getAll({
        page,
        limit: 24,
      });
      
      setPhotos(response.data.photos);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Fotoğraflar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (photo) => {
    setSelectedPhoto(photo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await photosAPI.delete(selectedPhoto.id);
      toast.success('Fotoğraf silindi');
      setDeleteDialogOpen(false);
      fetchPhotos();
    } catch (error) {
      toast.error('Fotoğraf silinirken hata oluştu');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Fotoğraf Yönetimi
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {photos.map((photo) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`http://localhost:3000${photo.photo_url}`}
                    alt="User photo"
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }} src={photo.profile_picture}>
                        {photo.first_name?.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {photo.first_name} {photo.last_name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUpIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {photo.likes_count || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CommentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {photo.comments_count || 0}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(photo.created_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>

                    {photo.caption && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {photo.caption}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(photo)}
                      fullWidth
                    >
                      Sil
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              size="large"
            />
          </Box>
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Fotoğrafı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu fotoğrafı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

