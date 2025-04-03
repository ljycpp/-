import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTabVisibility } from '@/contexts/useTabVisibility'
import Button from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/Table'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import EmptyCard from '@/components/ui/EmptyCard'
import Text from '@/components/ui/Text'
import UploadDocumentsDialog from '@/components/documents/UploadDocumentsDialog'
import ClearDocumentsDialog from '@/components/documents/ClearDocumentsDialog'

import { getDocuments, scanNewDocuments, DocsStatusesResponse } from '@/api/lightrag'
import { errorMessage } from '@/lib/utils'
import { toast } from 'sonner'
import { useBackendState } from '@/stores/state'

import { RefreshCwIcon, Leaf, Sprout } from 'lucide-react'

export default function DocumentManager() {
  const { t } = useTranslation()
  const health = useBackendState.use.health()
  const [docs, setDocs] = useState<DocsStatusesResponse | null>(null)
  const { isTabVisible } = useTabVisibility()
  const isDocumentsTabVisible = isTabVisible('documents')
  const initialLoadRef = useRef(false)
  const [agriDocTypes] = useState(['crop_report', 'soil_analysis', 'weather_data', 'farming_guide', 'other'])

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments()
      if (docs && docs.statuses) {
        // compose all documents count
        const numDocuments = Object.values(docs.statuses).reduce(
          (acc, status) => acc + status.length,
          0
        )
        if (numDocuments > 0) {
          setDocs(docs)
        } else {
          setDocs(null)
        }
      } else {
        setDocs(null)
      }
    } catch (err) {
      toast.error(t('documentPanel.documentManager.errors.loadFailed', { error: errorMessage(err) }))
    }
  }, [setDocs, t])

  // Only fetch documents when the tab becomes visible for the first time
  useEffect(() => {
    if (isDocumentsTabVisible && !initialLoadRef.current) {
      fetchDocuments()
      initialLoadRef.current = true
    }
  }, [isDocumentsTabVisible, fetchDocuments])

  const scanDocuments = useCallback(async () => {
    try {
      const { status } = await scanNewDocuments()
      toast.message(status)
    } catch (err) {
      toast.error(t('documentPanel.documentManager.errors.scanFailed', { error: errorMessage(err) }))
    }
  }, [t])

  // Only set up polling when the tab is visible and health is good
  useEffect(() => {
    if (!isDocumentsTabVisible || !health) {
      return
    }

    const interval = setInterval(async () => {
      try {
        await fetchDocuments()
      } catch (err) {
        toast.error(t('documentPanel.documentManager.errors.scanProgressFailed', { error: errorMessage(err) }))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [health, fetchDocuments, t, isDocumentsTabVisible])

  return (
    <Card className="!size-full !rounded-none !border-none bg-green-100 relative">
      {/* 添加背景图片 */}
      <div className="absolute inset-0 bg-[url('/agriculture-background.png')] bg-cover bg-center bg-no-repeat opacity-20 z-0"></div>
      
      <CardHeader className="border-b border-green-200 relative z-10">
        <div className="flex items-center">
          <Leaf className="mr-2 h-5 w-5 text-green-600" />
          <CardTitle className="text-lg text-green-800">{t('documentPanel.documentManager.title')} - 农业知识库</CardTitle>
        </div>
        <CardDescription className="text-green-700">
          管理您的农业相关文档，包括作物报告、土壤分析、天气数据和农业指南
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 relative z-10">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={scanDocuments}
            side="bottom"
            tooltip={t('documentPanel.documentManager.scanTooltip')}
            size="sm"
            className="bg-green-50 hover:bg-green-200 text-green-800 border-green-300"
          >
            <RefreshCwIcon className="mr-1" /> {t('documentPanel.documentManager.scanButton')}
          </Button>
          <Button
            variant="outline"
            side="bottom"
            tooltip="分类农业文档"
            size="sm"
            className="bg-green-50 hover:bg-green-200 text-green-800 border-green-300"
          >
            <Sprout className="mr-1" /> 农业文档分类
          </Button>
          <div className="flex-1" />
          <ClearDocumentsDialog />
          <UploadDocumentsDialog />
        </div>

        <Card className="border-green-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center">
              <Sprout className="mr-2 h-5 w-5 text-green-600" />
              {t('documentPanel.documentManager.uploadedTitle')} - 农业资料库
            </CardTitle>
            <CardDescription>{t('documentPanel.documentManager.uploadedDescription')}</CardDescription>
          </CardHeader>

          <CardContent>
            {!docs && (
              <EmptyCard
                title={t('documentPanel.documentManager.emptyTitle')}
                description="您的农业知识库还没有文档，请上传农业相关文档以开始分析"
              />
            )}
            {docs && (
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {agriDocTypes.map(type => (
                    <span key={type} className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 border border-green-300">
                      {type === 'crop_report' && '作物报告'}
                      {type === 'soil_analysis' && '土壤分析'}
                      {type === 'weather_data' && '天气数据'}
                      {type === 'farming_guide' && '农业指南'}
                      {type === 'other' && '其他'}
                    </span>
                  ))}
                </div>
                <Table>
                  <TableHeader className="bg-green-50">
                    <TableRow>
                      <TableHead>{t('documentPanel.documentManager.columns.id')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.summary')}</TableHead>
                      <TableHead>文档类型</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.status')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.length')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.chunks')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.created')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.updated')}</TableHead>
                      <TableHead>{t('documentPanel.documentManager.columns.metadata')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {Object.entries(docs.statuses).map(([status, documents]) =>
                      documents.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-green-50">
                          <TableCell className="truncate font-mono">{doc.id}</TableCell>
                          <TableCell className="max-w-xs min-w-24 truncate">
                            <Text
                              text={doc.content_summary}
                              tooltip={doc.content_summary}
                              tooltipClassName="max-w-none overflow-visible block"
                            />
                          </TableCell>
                          <TableCell>
                            {doc.metadata?.type || (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                {doc.content_summary?.toLowerCase().includes('crop') ? '作物报告' : 
                                 doc.content_summary?.toLowerCase().includes('soil') ? '土壤分析' : 
                                 doc.content_summary?.toLowerCase().includes('weather') ? '天气数据' : 
                                 doc.content_summary?.toLowerCase().includes('farm') ? '农业指南' : '其他'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {status === 'processed' && (
                              <span className="text-green-600">{t('documentPanel.documentManager.status.completed')}</span>
                            )}
                            {status === 'processing' && (
                              <span className="text-blue-600">{t('documentPanel.documentManager.status.processing')}</span>
                            )}
                            {status === 'pending' && <span className="text-yellow-600">{t('documentPanel.documentManager.status.pending')}</span>}
                            {status === 'failed' && <span className="text-red-600">{t('documentPanel.documentManager.status.failed')}</span>}
                            {doc.error && (
                              <span className="ml-2 text-red-500" title={doc.error}>
                                ⚠️
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{doc.content_length ?? '-'}</TableCell>
                          <TableCell>{doc.chunks_count ?? '-'}</TableCell>
                          <TableCell className="truncate">
                            {new Date(doc.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="truncate">
                            {new Date(doc.updated_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {doc.metadata ? JSON.stringify(doc.metadata) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
