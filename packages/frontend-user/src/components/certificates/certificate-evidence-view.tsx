'use client';

import { Award, Bot, Calendar, Clock, MessageSquare, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import type { AIAuthorshipStats, CertificateSeal, CertificateSealStatus, CertificateType } from '@humanly/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentReplay } from '@/components/certificates/document-replay';

export interface CertificateEvidenceRecord {
  id: string;
  documentId?: string;
  title: string;
  certificateType: CertificateType | string;
  generatedAt: string | Date;
  totalCharacters: number;
  typedCharacters: number;
  pastedCharacters: number;
  totalEvents: number;
  typingEvents: number;
  pasteEvents: number;
  editingTimeSeconds: number;
  includeEditHistory?: boolean;
  signerName?: string | null;
}

interface CertificateEvidenceViewProps {
  certificate: CertificateEvidenceRecord;
  aiStats?: AIAuthorshipStats | null;
  isLoadingAiStats?: boolean;
  replayToken?: string;
  seal?: CertificateSeal;
  sealStatus?: CertificateSealStatus;
  integrityMessage?: string;
}

function getSealStatusLabel(status?: CertificateSealStatus) {
  if (status === 'valid') return 'Seal verified';
  if (status === 'legacy_valid') return 'Legacy signature';
  if (status === 'invalid') return 'Seal mismatch';
  return 'Seal unavailable';
}

export function CertificateEvidenceView({
  certificate,
  aiStats,
  isLoadingAiStats = false,
  replayToken,
  seal,
  sealStatus,
  integrityMessage,
}: CertificateEvidenceViewProps) {
  const totalAuthored = certificate.typedCharacters + certificate.pastedCharacters;
  const typedPercentage = totalAuthored > 0
    ? (certificate.typedCharacters / totalAuthored) * 100
    : 0;
  const pastedPercentage = totalAuthored > 0
    ? (certificate.pastedCharacters / totalAuthored) * 100
    : 0;
  const editingMinutes = Math.round(certificate.editingTimeSeconds / 60);
  const textImprovementTotal = aiStats?.selectionActions.total || 0;
  const aiChatTotal = aiStats?.aiQuestions.total || 0;
  const isFullyHumanCreated = certificate.pastedCharacters === 0 && certificate.typedCharacters > 0;
  const sealHashPreview = seal?.payloadHash
    ? `${seal.payloadHash.slice(0, 12)}...${seal.payloadHash.slice(-12)}`
    : null;
  const showReplay = Boolean(certificate.includeEditHistory && replayToken);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <Award className="mt-1 h-6 w-6 shrink-0 text-accent" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-normal">{certificate.title}</h1>
                    <Badge
                      variant="outline"
                      className="border-[#c8d4c8] bg-[#eef3ed] px-2 py-0.5 text-xs text-[#58715f]"
                    >
                      {getSealStatusLabel(sealStatus)}
                    </Badge>
                    {isFullyHumanCreated && (
                      <Badge
                        variant="outline"
                        className="border-[#c8d4c8] bg-[#eef3ed] px-2 py-0.5 text-xs text-[#58715f]"
                      >
                        100% Human Created
                      </Badge>
                    )}
                  </div>
                  {certificate.signerName && (
                    <p className="mt-1 text-sm text-muted-foreground">By: {certificate.signerName}</p>
                  )}
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Generated {format(new Date(certificate.generatedAt), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
            <p className="max-w-full text-sm text-muted-foreground lg:ml-6 lg:shrink-0 lg:whitespace-nowrap lg:text-right">
              A certificate of typing activity, pasted text, replay, and AI assistance.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal">Authorship Statistics</h2>
              <p className="text-sm text-muted-foreground">
                Text composition and event counts captured during writing.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
                <p className="text-xs text-muted-foreground">Typed</p>
                <p className="mt-1 text-2xl font-semibold">{typedPercentage.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
                <p className="text-xs text-muted-foreground">Pasted</p>
                <p className="mt-1 text-2xl font-semibold">{pastedPercentage.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
                <p className="text-xs text-muted-foreground">Final Text</p>
                <p className="mt-1 text-2xl font-semibold">{certificate.totalCharacters.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
                <p className="text-xs text-muted-foreground">Writing Time</p>
                <p className="mt-1 text-2xl font-semibold">{editingMinutes} min</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Typing Events</p>
                <p className="mt-1 text-xl font-semibold">{certificate.typingEvents.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Paste Events</p>
                <p className="mt-1 text-xl font-semibold">{certificate.pasteEvents.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
                <p className="mt-1 text-xl font-semibold">{certificate.totalEvents.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Typed vs pasted composition</span>
              <span className="font-medium">
                {certificate.typedCharacters.toLocaleString()} typed · {certificate.pastedCharacters.toLocaleString()} pasted
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
              <div className="bg-primary" style={{ width: `${typedPercentage}%` }} />
              <div className="bg-[#b9774f]" style={{ width: `${pastedPercentage}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#b9774f]" />
            <CardTitle className="text-lg">AI Assistance</CardTitle>
          </div>
          <CardDescription>How AI was used while writing this document.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAiStats ? (
            <div className="flex items-center justify-center py-6">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : aiStats ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Wand2 className="h-4 w-4 text-[#b9774f]" />
                  Text Improvements
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/35 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Grammar</p>
                    <p className="text-xl font-semibold">{aiStats.selectionActions.grammarFixes}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/35 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Improve</p>
                    <p className="text-xl font-semibold">{aiStats.selectionActions.improveWriting}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/35 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Simplify</p>
                    <p className="text-xl font-semibold">{aiStats.selectionActions.simplify}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/35 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Formal</p>
                    <p className="text-xl font-semibold">{aiStats.selectionActions.makeFormal}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {textImprovementTotal} total · {aiStats.selectionActions.accepted} accepted · {aiStats.selectionActions.rejected} discarded
                  {textImprovementTotal > 0 ? ` · ${aiStats.selectionActions.acceptanceRate.toFixed(0)}% acceptance` : ''}
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-[#b9774f]" />
                  AI Chat
                </p>
                <p className="mt-3 text-3xl font-semibold">{aiChatTotal}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chat questions asked in this document.
                </p>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No AI statistics available.
            </p>
          )}
        </CardContent>
      </Card>

      {showReplay && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Replay</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Watch how this certificate was created from recorded edit history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentReplay token={replayToken!} />
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Certificate integrity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs sm:text-sm">
          <p>
            This certificate was checked against the Humanly server-issued integrity seal for the protected certificate
            record, including the writing metrics, document identity, generated timestamp, and current display options.
          </p>
          {sealHashPreview && (
            <p className="font-mono text-[11px] text-muted-foreground sm:text-xs">
              Payload hash: {sealHashPreview}
            </p>
          )}
          {integrityMessage && (
            <p className="text-muted-foreground">{integrityMessage}</p>
          )}
          <p className="text-muted-foreground">
            The authorship statistics come from write-time tracking of typing, paste, replayed edit history, and in-platform
            AI assistance. The seal verifies the certificate record shown here; it does not make claims about off-platform behavior.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
