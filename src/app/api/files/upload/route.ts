import { NextRequest, NextResponse } from 'next/server';
import { getJohnDeereAPIClient } from '@/lib/johndeere-api';

export async function POST(request: NextRequest) {
  try {
    // Use Next.js built-in formData() method
    const formData = await request.formData();
    
    // Extract fields and files
    const organizationId = formData.get('organizationId') as string;
    const file = formData.get('file') as File;
    const userIntent = formData.get('userIntent') as string; // New: capture user's intent
    const explicitFileType = formData.get('fileType') as string; // New: allow explicit type override

    if (!organizationId || !file) {
      return NextResponse.json({ error: 'Missing organizationId or file.' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    console.log(`📁 Uploading file: ${file.name} (${fileContent.length} bytes) to organization ${organizationId}`);
    console.log(`💭 User intent: ${userIntent || 'not specified'}`);
    console.log(`🎯 Explicit file type: ${explicitFileType || 'not specified'}`);

    // Intelligent file type detection
    let fileType = explicitFileType;
    let fileTypeInfo = null;

    if (!fileType) {
      const apiClient = getJohnDeereAPIClient();
      fileTypeInfo = (apiClient.constructor as any).detectFileType(file.name, userIntent);
      fileType = fileTypeInfo.fileType;
      
      console.log(`🤖 Auto-detected file type: ${fileType} (confidence: ${fileTypeInfo.confidence})`);
      console.log(`💡 Reasoning: ${fileTypeInfo.reasoning}`);
      
      // If confidence is low, suggest asking user for clarification
      if (fileTypeInfo.confidence === 'low') {
        return NextResponse.json({ 
          error: 'Unable to determine file type',
          suggestUserQuery: true,
          detectedType: fileType,
          reasoning: fileTypeInfo.reasoning,
          availableTypes: [
            { value: 'PRESCRIPTION', label: 'Prescription (Variable Rate Application Maps)' },
            { value: 'BOUNDARY', label: 'Boundary (Field Boundaries and Shapes)' },
            { value: 'WORK_DATA', label: 'Work Data (Harvest, Planting, Operations)' },
            { value: 'SETUP_FILE', label: 'Setup File (Equipment Configuration)' },
            { value: 'REPORT', label: 'Report (Analysis and Summary Documents)' },
            { value: 'OTHER', label: 'Other (General Files)' }
          ],
          message: `I couldn't determine the file type for "${file.name}". Please specify what type of file this is so I can upload it to the correct category in John Deere.`
        }, { status: 400 });
      }
    }

    // Proceed with upload - try files endpoint first, then fileTransfers as fallback
    const apiClient = getJohnDeereAPIClient();
    
    try {
      // Try the standard files endpoint first
      const result = await apiClient.uploadFile(organizationId, fileContent, file.name, file.type, fileType);
      
      return NextResponse.json({ 
        success: true, 
        result,
        fileType,
        endpoint: 'files',
        // Add the expected fields for ChatInput
        fileUrl: result.location || `https://api.deere.com/platform/files/${result.fileId}`,
        fileId: result.fileId,
        fileName: result.fileName || file.name,
        fileSize: result.fileSize || fileContent.length,
        uploadSuccess: true,
        message: `Successfully uploaded ${fileType} file "${file.name}" to John Deere Files`,
        fileTypeInfo: fileTypeInfo ? {
          confidence: fileTypeInfo.confidence,
          reasoning: fileTypeInfo.reasoning
        } : null
      });
      
    } catch (error: any) {
      console.log(`❌ Files endpoint failed with status ${error.response?.status}`);
      
      // If files endpoint fails with 415, try fileTransfers endpoint
      if (error.response?.status === 415) {
        console.log(`🔄 Trying alternative fileTransfers endpoint...`);
        
        try {
          const result = await apiClient.uploadFileViaTransfer(organizationId, fileContent, file.name, file.type, fileType);
          
          return NextResponse.json({ 
            success: true, 
            result,
            fileType,
            endpoint: 'fileTransfers',
            message: 'Upload successful via fileTransfers endpoint (fallback method)',
            // Add the expected fields for ChatInput
            fileUrl: result.location || `https://api.deere.com/platform/files/${result.fileId}`,
            fileId: result.fileId,
            fileName: result.fileName || file.name,
            fileSize: result.fileSize || fileContent.length,
            uploadSuccess: true,
            fileTypeInfo: fileTypeInfo ? {
              confidence: fileTypeInfo.confidence,
              reasoning: fileTypeInfo.reasoning
            } : null
          });
          
        } catch (transferError: any) {
          console.log(`❌ FileTransfers endpoint also failed:`, transferError.response?.status);
          
          return NextResponse.json({ 
            error: 'Both file upload endpoints failed',
            details: {
              filesEndpoint: {
                status: error.response?.status,
                error: error.response?.data
              },
              fileTransfersEndpoint: {
                status: transferError.response?.status,
                error: transferError.response?.data
              }
            },
            suggestion: 'John Deere API may not support direct file uploads via API. Consider using their My Transfer Mobile App workflow.'
          }, { status: 500 });
        }
      } else {
        // For non-415 errors, return the original error
        throw error;
      }
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
} 