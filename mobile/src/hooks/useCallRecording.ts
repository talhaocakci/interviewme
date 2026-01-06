import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setRecording, addRecordingChunk } from '../store/slices/callSlice';
import apiService from '../services/api';

export const useCallRecording = () => {
  const dispatch = useDispatch();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const startRecording = async (stream: any) => {
    try {
      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        console.error('MediaRecorder not supported');
        return false;
      }

      const options = {
        mimeType: 'video/webm;codecs=vp8,opus',
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
          dispatch(addRecordingChunk(event.data));
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped');
        setIsRecording(false);
        dispatch(setRecording(false));
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      dispatch(setRecording(true));
      
      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: 'video/webm',
        });
        
        setIsRecording(false);
        dispatch(setRecording(false));
        
        // Clear chunks
        recordingChunksRef.current = [];
        
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  const uploadRecording = async (callId: number, recordingBlob: Blob) => {
    try {
      // Get presigned URL from backend
      const timestamp = new Date().getTime();
      const filename = `call_${callId}_${timestamp}.webm`;
      
      const { upload_url, file_key } = await apiService.getPresignedUploadUrl(
        filename,
        'video/webm'
      );

      // Upload to S3
      const uploadSuccess = await apiService.uploadFile(recordingBlob, upload_url);
      
      if (!uploadSuccess) {
        throw new Error('Failed to upload recording');
      }

      // Register recording in backend
      await apiService.uploadRecording(callId, {
        s3_key: file_key,
        s3_bucket: 'your-bucket-name', // Should come from config
        file_size: recordingBlob.size,
      });

      console.log('Recording uploaded successfully');
      return true;
    } catch (error) {
      console.error('Error uploading recording:', error);
      return false;
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    uploadRecording,
  };
};

