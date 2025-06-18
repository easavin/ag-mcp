import { NextRequest, NextResponse } from 'next/server';
import { getJohnDeereAPIClient } from '@/lib/johndeere-api';
import multiparty, { File } from 'multiparty';
import fs from 'fs';

async function parseForm(req: NextRequest): Promise<{ fields: Record<string, string>; files: Record<string, File[]> }> {
  const body = await req.text();
  const boundary = req.headers.get('content-type')?.split('boundary=')[1];

  return new Promise((resolve, reject) => {
    if (!boundary) {
      return reject(new Error("Missing boundary in content-type header"));
    }
    
    const form = new multiparty.Form({ autoFiles: true });
    
    // Fake a request object for multiparty
    const fakeReq = {
        headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`
        },
        body: body,
        // multiparty expects a stream, so we provide a dummy one
        [Symbol.asyncIterator]: async function* () {
            yield body;
        }
    };

    // Cast to any to satisfy multiparty's parse method signature
    form.parse(fakeReq as any, (err, fields, files) => {
        if (err) {
            return reject(err);
        }
        
        const flattenedFields = Object.keys(fields).reduce((acc, key) => {
            const fieldValue = fields[key];
            if (fieldValue && fieldValue.length > 0) {
                acc[key] = fieldValue[0];
            }
            return acc;
        }, {} as Record<string, string>);

        resolve({ fields: flattenedFields, files: files as Record<string, File[]> });
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const { fields, files } = await parseForm(request);
    const { organizationId } = fields;
    const fileArray = files.file;

    if (!organizationId || !fileArray || fileArray.length === 0) {
      return NextResponse.json({ error: 'Missing organizationId or file.' }, { status: 400 });
    }
    
    const file = fileArray[0];

    if (!file.path) {
      return NextResponse.json({ error: 'File path is missing.' }, { status: 400 });
    }

    const fileContent = fs.readFileSync(file.path);
    const apiClient = getJohnDeereAPIClient();
    const result = await apiClient.uploadFile(
      organizationId,
      fileContent,
      file.originalFilename,
      file.headers['content-type']
    );

    // Clean up the temporary file
    fs.unlinkSync(file.path);

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error('Error uploading file to John Deere:', error);
    return NextResponse.json({ error: 'Failed to upload file.', details: error.message }, { status: 500 });
  }
} 