import { NextRequest, NextResponse } from 'next/server';
import { getJohnDeereAPIClient } from '@/lib/johndeere-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    const apiClient = getJohnDeereAPIClient();

    // First, decode the token to check scopes
    let tokenScopeCheck = null;
    try {
      const token = await (apiClient as any).getValidAccessToken();
      if (token) {
        const payload = token.split('.')[1];
        const paddedPayload = payload + '='.repeat(4 - payload.length % 4);
        const decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString());
        const scopes = decoded.scp || [];
        
        tokenScopeCheck = {
          hasToken: true,
          allScopes: scopes,
          requiredForPrescriptions: {
            files: scopes.includes('files'),
            ag3: scopes.includes('ag3'),
            ag2: scopes.includes('ag2'),
            ag1: scopes.includes('ag1'),
          },
          tokenExpiry: new Date(decoded.exp * 1000).toISOString(),
          clientId: decoded.aud,
        };
      } else {
        tokenScopeCheck = { hasToken: false, error: 'No valid token found' };
      }
    } catch (error: any) {
      tokenScopeCheck = { hasToken: false, error: error.message };
    }

    // Get organizations to check connection links
    const organizations = await apiClient.getOrganizations();
    const targetOrg = organizations.find(org => org.id === organizationId);
    
    // Check what specific links and permissions are available
    const permissionChecks = {
      organizationFound: !!targetOrg,
      organizationData: targetOrg,
      availableLinks: targetOrg?.links?.map((link: any) => link.rel) || [],
      hasFilesLink: targetOrg?.links?.some((link: any) => link.rel === 'files') || false,
      hasUploadFileLink: targetOrg?.links?.some((link: any) => link.rel === 'uploadFile') || false,
      hasTransferableFilesLink: targetOrg?.links?.some((link: any) => link.rel === 'transferableFiles') || false,
      hasPrescriptionsLink: targetOrg?.links?.some((link: any) => link.rel === 'prescriptions') || false,
      hasFieldsLink: targetOrg?.links?.some((link: any) => link.rel === 'fields') || false,
    };

    // Try to access files endpoint to see what error we get
    let filesAccessTest = null;
    try {
      const files = await apiClient.getFiles(organizationId);
      filesAccessTest = {
        success: true,
        hasFiles: Array.isArray(files),
        fileCount: files.length,
        sampleFiles: files.slice(0, 3).map((f: any) => ({ name: f.name, type: f.type }))
      };
    } catch (error: any) {
      filesAccessTest = {
        success: false,
        status: error.response?.status,
        error: error.response?.data,
        message: error.message
      };
    }

    // Try to access fields endpoint (needed for prescription uploads)
    let fieldsAccessTest = null;
    try {
      const fields = await apiClient.getFields(organizationId);
      fieldsAccessTest = {
        success: true,
        hasFields: Array.isArray(fields),
        fieldCount: fields.length,
        sampleFields: fields.slice(0, 3).map((f: any) => ({ id: f.id, name: f.name }))
      };
    } catch (error: any) {
      fieldsAccessTest = {
        success: false,
        status: error.response?.status,
        error: error.response?.data,
        message: error.message
      };
    }

    // Prescription Upload Readiness Assessment
    const prescriptionReadiness = {
      canUploadPrescriptions: (
        tokenScopeCheck?.requiredForPrescriptions?.files &&
        tokenScopeCheck?.requiredForPrescriptions?.ag3 &&
        permissionChecks.hasFilesLink &&
        fieldsAccessTest?.success
      ),
      issues: [] as string[]
    };

    if (!tokenScopeCheck?.requiredForPrescriptions?.files) {
      prescriptionReadiness.issues.push("❌ Missing 'files' scope - required for file uploads");
    }
    if (!tokenScopeCheck?.requiredForPrescriptions?.ag3) {
      prescriptionReadiness.issues.push("❌ Missing 'ag3' scope - required for prescription management");
    }
    if (!permissionChecks.hasFilesLink) {
      prescriptionReadiness.issues.push("❌ Organization missing files link - connection issue");
    }
    if (!fieldsAccessTest?.success) {
      prescriptionReadiness.issues.push("❌ Cannot access fields - needed to associate prescriptions");
    }

    if (prescriptionReadiness.canUploadPrescriptions) {
      prescriptionReadiness.issues.push("✅ All requirements met for prescription uploads!");
    }

    return NextResponse.json({
      success: true,
      organizationId,
      tokenScopeCheck,
      permissionChecks,
      filesAccessTest,
      fieldsAccessTest,
      prescriptionReadiness,
      recommendations: [
        tokenScopeCheck?.hasToken ? "✅ Valid token found" : "❌ No valid token",
        tokenScopeCheck?.requiredForPrescriptions?.files ? "✅ Has 'files' scope" : "❌ Missing 'files' scope",
        tokenScopeCheck?.requiredForPrescriptions?.ag3 ? "✅ Has 'ag3' scope" : "❌ Missing 'ag3' scope",
        permissionChecks.hasFilesLink ? "✅ Organization has files link" : "❌ Organization missing files link",
        permissionChecks.hasFieldsLink ? "✅ Organization has fields link" : "❌ Organization missing fields link",
        filesAccessTest?.success ? "✅ Can access files endpoint" : "❌ Cannot access files endpoint",
        fieldsAccessTest?.success ? "✅ Can access fields endpoint" : "❌ Cannot access fields endpoint",
        prescriptionReadiness.canUploadPrescriptions ? "🎯 READY FOR PRESCRIPTION UPLOADS!" : "⚠️ Not ready for prescription uploads"
      ]
    });

  } catch (error: any) {
    console.error('Permission check error:', error);
    return NextResponse.json({ 
      error: 'Permission check failed', 
      details: {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      }
    }, { status: 500 });
  }
} 