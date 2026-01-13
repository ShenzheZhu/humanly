'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCertificate } from '@/hooks/use-certificates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AccessCodeDialog } from '@/components/certificates/access-code-dialog';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  FileJson,
  FileText,
  Calendar,
  Award,
  Clock,
  Type,
  Copy,
  Check,
  Share2,
  Lock,
  Settings,
  Edit2,
  X,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { Input } from '@/components/ui/input';

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const certificateId = params.id as string;
  const { certificate, isLoading, error, downloadJSON, downloadPDF, updateAccessCode, updateDisplayOptions } = useCertificate(certificateId);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
  const [editedAccessCode, setEditedAccessCode] = useState('');
  const [isUpdatingAccessCode, setIsUpdatingAccessCode] = useState(false);
  const [isUpdatingDisplay, setIsUpdatingDisplay] = useState(false);

  useEffect(() => {
    if (certificate) {
      const verifyUrl = `https://app.humanly.art/verify/${certificate.verificationToken}`;
      QRCode.toDataURL(verifyUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((dataURL) => setQrCodeDataURL(dataURL))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [certificate]);

  const handleDownloadJSON = async () => {
    try {
      await downloadJSON();
      toast({
        title: 'Success',
        description: 'JSON certificate downloaded successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to download JSON',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await downloadPDF();
      toast({
        title: 'Success',
        description: 'PDF certificate downloaded successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleCopyVerificationToken = () => {
    if (certificate) {
      navigator.clipboard.writeText(certificate.verificationToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Verification token copied to clipboard',
      });
    }
  };

  const handleShareVerificationLink = () => {
    if (certificate) {
      const verifyUrl = `https://app.humanly.art/verify/${certificate.verificationToken}`;
      navigator.clipboard.writeText(verifyUrl);
      toast({
        title: 'Link Copied',
        description: 'Verification link copied to clipboard',
      });
    }
  };

  const handleStartEdit = () => {
    setEditedAccessCode(certificate?.accessCode || '');
    setIsEditingAccessCode(true);
  };

  const handleStartAddCode = () => {
    setEditedAccessCode('');
    setIsEditingAccessCode(true);
  };

  const handleSaveAccessCode = async () => {
    if (editedAccessCode.length < 4) {
      toast({
        title: 'Error',
        description: 'Access code must be at least 4 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdatingAccessCode(true);
      await updateAccessCode(editedAccessCode);
      toast({
        title: 'Success',
        description: certificate?.isProtected 
          ? 'Access code updated successfully'
          : 'Access code set successfully',
      });
      setIsEditingAccessCode(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update access code',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAccessCode(false);
    }
  };

  const handleRemoveAccessCode = async () => {
    try {
      setIsUpdatingAccessCode(true);
      await updateAccessCode(null);
      toast({
        title: 'Success',
        description: 'Access code removed successfully',
      });
      setIsEditingAccessCode(false);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove access code',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingAccessCode(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingAccessCode(false);
    setEditedAccessCode('');
  };

  const handleToggleDisplayOption = async (option: 'fullText' | 'editHistory', value: boolean) => {
    try {
      setIsUpdatingDisplay(true);
      if (option === 'fullText') {
        await updateDisplayOptions(value, certificate?.includeEditHistory);
      } else {
        await updateDisplayOptions(certificate?.includeFullText, value);
      }
      toast({
        title: 'Success',
        description: 'Display options updated successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update display options',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDisplay(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="mt-2 text-sm">{error || 'Certificate not found'}</p>
          <Button
            onClick={() => router.push('/certificates')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Certificates
          </Button>
        </div>
      </div>
    );
  }

  // Calculate percentages based on total authorship activity (typed + pasted), not final document length
  const totalAuthored = certificate.typedCharacters + certificate.pastedCharacters;
  const typedPercentage = totalAuthored > 0
    ? (certificate.typedCharacters / totalAuthored) * 100
    : 0;
  const pastedPercentage = totalAuthored > 0
    ? (certificate.pastedCharacters / totalAuthored) * 100
    : 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Button
          onClick={() => router.push('/certificates')}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Certificates
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">{certificate.title}</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              Generated on {format(new Date(certificate.generatedAt), 'MMMM dd, yyyy')}
            </p>
          </div>
          <Badge
            variant={certificate.certificateType === 'full_authorship' ? 'default' : 'secondary'}
            className="text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2 self-start"
          >
            {certificate.certificateType === 'full_authorship' ? 'Full Authorship' : 'Partial Authorship'}
          </Badge>
        </div>
      </div>

      {/* Main Statistics and Verification Section */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column: Authorship Statistics (takes 3/5 width) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Authorship Statistics</CardTitle>
              <CardDescription>Detailed breakdown of document authorship</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Final Document Length</p>
                  <p className="text-2xl font-bold">{certificate.totalCharacters.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{certificate.totalEvents.toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Authorship Composition (cumulative throughout editing)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Type className="h-4 w-4" />
                      Characters Typed
                    </p>
                    <p className="text-xl font-semibold">
                      {certificate.typedCharacters.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({typedPercentage.toFixed(1)}%)
                      </span>
                    </p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${typedPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Characters Pasted
                    </p>
                    <p className="text-xl font-semibold">
                      {certificate.pastedCharacters.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({pastedPercentage.toFixed(1)}%)
                      </span>
                    </p>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${pastedPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Typing Events</p>
                  <p className="text-lg font-semibold">{certificate.typingEvents.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Paste Events</p>
                  <p className="text-lg font-semibold">{certificate.pasteEvents.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Editing Time
                  </p>
                  <p className="text-lg font-semibold">
                    {Math.round(certificate.editingTimeSeconds / 60)} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Verification Section (takes 2/5 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification QR Code</CardTitle>
              <CardDescription>Scan to verify certificate</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {qrCodeDataURL ? (
                <img
                  src={qrCodeDataURL}
                  alt="Verification QR Code"
                  className="w-48 h-48 border rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded-lg" />
              )}
              <Button
                onClick={handleShareVerificationLink}
                variant="outline"
                size="sm"
                className="mt-4 w-full"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Verification Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification Token</CardTitle>
              <CardDescription>Use this token to verify the certificate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                {certificate.verificationToken}
              </div>
              <Button
                onClick={handleCopyVerificationToken}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Token
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Downloads and Details Section */}
      <div className="grid gap-6 lg:grid-cols-5 mt-6">
        {/* Left Column: Downloads and Certificate Details (takes 3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Download Certificate</CardTitle>
              <CardDescription>Download your certificate in different formats</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={handleDownloadPDF} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={handleDownloadJSON} variant="outline" className="flex-1">
                <FileJson className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Certificate ID</p>
                <p className="font-mono text-xs">{certificate.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Document ID</p>
                <p className="font-mono text-xs">{certificate.documentId}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Certificate Settings (takes 2/5 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Certificate Settings</CardTitle>
              </div>
              <CardDescription>
                Manage access protection and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Access Protection Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {certificate.isProtected ? (
                    <Lock className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold text-sm">Access Protection</h3>
                </div>

                {!isEditingAccessCode ? (
                  <>
                    {certificate.isProtected && certificate.accessCode ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Certificate is protected. Viewers need this code:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                            {certificate.accessCode}
                          </div>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(certificate.accessCode!);
                              toast({
                                title: 'Copied',
                                description: 'Access code copied to clipboard',
                              });
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={handleStartEdit}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={handleRemoveAccessCode}
                            variant="ghost"
                            size="sm"
                            disabled={isUpdatingAccessCode}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Certificate is public. Anyone with the link can view it.
                        </p>
                        <Button
                          onClick={handleStartAddCode}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Add Access Code
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {certificate.isProtected ? 'Edit access code:' : 'Enter access code (min 4 characters):'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Enter code"
                        value={editedAccessCode}
                        onChange={(e) => setEditedAccessCode(e.target.value)}
                        disabled={isUpdatingAccessCode}
                        className="flex-1 h-9 text-sm font-mono"
                        autoFocus
                      />
                      <Button
                        onClick={handleSaveAccessCode}
                        size="sm"
                        disabled={isUpdatingAccessCode || editedAccessCode.trim().length < 4}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="outline"
                        disabled={isUpdatingAccessCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Public Display Options Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Public Display Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="includeFullText" className="flex flex-col space-y-1 cursor-pointer">
                      <span className="text-sm font-medium">Show Full Text</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Display complete document content
                      </span>
                    </Label>
                    <Switch
                      id="includeFullText"
                      checked={certificate.includeFullText}
                      onCheckedChange={(checked) => handleToggleDisplayOption('fullText', checked)}
                      disabled={isUpdatingDisplay}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="includeEditHistory" className="flex flex-col space-y-1 cursor-pointer">
                      <span className="text-sm font-medium">Show Edit History</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Display complete editing timeline
                      </span>
                    </Label>
                    <Switch
                      id="includeEditHistory"
                      checked={certificate.includeEditHistory}
                      onCheckedChange={(checked) => handleToggleDisplayOption('editHistory', checked)}
                      disabled={isUpdatingDisplay}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
