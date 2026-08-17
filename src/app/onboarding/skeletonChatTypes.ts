export interface DraftBlock {
  client_id: string
  day_of_week: number
  start_time: string
  end_time: string
  title: string
  is_hard_constraint: boolean
  energy_cost: number
  flexibility_score: number
}

type BlockFields = Omit<DraftBlock, 'client_id'>

export type PatchOperation =
  | { op: 'add'; block: BlockFields }
  | { op: 'update'; block_id: string; fields: Partial<BlockFields> }
  | { op: 'delete'; block_id: string }

export interface EditSkeletonResult {
  is_relevant: boolean
  rejection_reason?: string
  needs_clarification: boolean
  clarification_question?: string
  ambiguous_block_ids: string[]
  patch: PatchOperation[]
}

export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  displayText: string
  ambiguousBlocks?: DraftBlock[]
}

export type EditSkeletonApiResponse =
  | { status: 'ok'; data: EditSkeletonResult; sessionTotalTokens: number }
  | { status: 'budget_exceeded'; sessionTotalTokens: number }
  | { status: 'error'; message: string }

export function applyPatch(blocks: DraftBlock[], patch: PatchOperation[]): DraftBlock[] {
  let result = blocks
  for (const op of patch) {
    if (op.op === 'add') {
      result = [...result, { ...op.block, client_id: crypto.randomUUID() }]
    } else if (op.op === 'update') {
      result = result.map((b) => (b.client_id === op.block_id ? { ...b, ...op.fields } : b))
    } else if (op.op === 'delete') {
      result = result.filter((b) => b.client_id !== op.block_id)
    }
  }
  return result
}

export function summarizePatch(patch: PatchOperation[]): string {
  if (patch.length === 0) return 'Herhangi bir değişiklik yapılmadı.'
  const added = patch.filter((p) => p.op === 'add').length
  const updated = patch.filter((p) => p.op === 'update').length
  const deleted = patch.filter((p) => p.op === 'delete').length
  const parts: string[] = []
  if (added) parts.push(`${added} blok eklendi`)
  if (updated) parts.push(`${updated} blok güncellendi`)
  if (deleted) parts.push(`${deleted} blok silindi`)
  return parts.join(', ') + '.'
}
