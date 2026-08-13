import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '../../../')
const frontendSourceRoot = path.join(repositoryRoot, 'apps/frontend/src')

const activeViews = [
  'views/admin/Dashboard.vue',
  'views/admin/Users.vue',
  'views/admin/UserFormView.vue',
  'views/admin/UserDetailView.vue',
  'views/assets/AssetListView.vue',
  'views/assets/AssetDetailView.vue',
  'views/assets/AssetFormView.vue',
  'views/assets/AssetCatalogView.vue',
  'views/assets/AssetQrScanView.vue',
  'views/assets/AssetQrEntryView.vue',
  'views/borrow/MyRequestsView.vue',
  'views/borrow/BorrowRequestCreateView.vue',
  'views/borrow/BorrowRequestDetailView.vue',
  'views/borrow/ApprovalQueueView.vue',
  'views/borrow/ApprovalDetailView.vue',
  'views/borrow/HandoverReturnView.vue',
  'views/borrow/BorrowingActivityView.vue',
  'views/borrow/BorrowingActivityDetailView.vue',
  'views/issues/AssetIssueListView.vue',
  'views/issues/AssetIssueDetailView.vue',
  'views/administration/AdministrationIndexView.vue',
  'views/administration/RegistrationRequestListView.vue',
  'views/administration/RegistrationRequestDetailView.vue',
  'views/administration/RoleListView.vue',
  'views/administration/RoleFormView.vue',
  'views/notifications/NotificationCenterView.vue',
  'views/login/Login.vue',
  'views/login/register.vue',
]

const failures = []
const passes = []

function readSource(relativePath) {
  return fs.readFileSync(path.join(frontendSourceRoot, relativePath), 'utf8')
}

function pass(message) {
  passes.push(message)
}

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (condition) pass(message)
  else fail(message)
}

const workspaceLayout = readSource('components/layout/WorkspaceLayout.vue')
const responsiveCss = readSource('assets/responsive.css')
const tokensCss = readSource('assets/tokens.css')
const approvalDetail = readSource('views/borrow/ApprovalDetailView.vue')

assert(
  /min-height:\s*100vh[\s\S]*min-height:\s*100dvh/.test(workspaceLayout),
  'Workspace shell/drawer has 100vh fallback and 100dvh sizing',
)
assert(
  workspaceLayout.includes('mobile-drawer') && workspaceLayout.includes('workspace-layout__backdrop'),
  'Workspace navigation uses the shared mobile drawer and backdrop structure',
)
assert(
  responsiveCss.includes('.bigin-table-scroll-wrapper') && responsiveCss.includes('.bigin-responsive-footer'),
  'Shared responsive classes are defined',
)
assert(
  responsiveCss.includes('@media (pointer: coarse) and (max-width: 991px)'),
  'Coarse-pointer touch target contract is defined',
)
assert(
  responsiveCss.includes('100dvh') && responsiveCss.includes('calc(100vw - 32px)'),
  'Shared modal/dynamic viewport constraints are defined',
)
assert(
  responsiveCss.includes('max-width: 575px') && responsiveCss.includes('max-width: 767px'),
  'Shared mobile and tablet breakpoint boundaries are defined',
)
for (const token of [
  '--bigin-z-header',
  '--bigin-z-nav-backdrop',
  '--bigin-z-nav-drawer',
  '--bigin-z-popup',
  '--bigin-z-modal',
]) {
  assert(tokensCss.includes(token), `Z-index token ${token} is defined`)
}

for (const relativePath of activeViews) {
  const source = readSource(relativePath)
  if (!source.includes('<a-table')) continue

  assert(
    /:scroll\s*=\s*["'][^>]*x:\s*["']?['"]?max-content['"][^>]*["']/.test(source),
    `${relativePath} uses Ant table native max-content scrolling`,
  )
  assert(
    source.includes('bigin-table-scroll-wrapper'),
    `${relativePath} wraps its Ant table in the shared table surface`,
  )
}

const minWidthSelectorPattern = /(page|toolbar|footer|surface)/i
for (const relativePath of activeViews) {
  if (relativePath === 'views/borrow/ApprovalDetailView.vue') continue
  const source = readSource(relativePath)
  for (const [, selector, declarationsBlock] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!minWidthSelectorPattern.test(selector)) continue
    const declarations = [...declarationsBlock.matchAll(/min-width\s*:\s*([^;},\s]+)/g)]
    for (const [, value] of declarations) {
      if (value !== '0' && value !== '0px') {
        fail(`${relativePath} has page/toolbar/footer/surface min-width ${value}`)
      }
    }
  }
}
pass('No page/toolbar/footer/surface min-width declarations violate the active-view contract')

for (const relativePath of activeViews) {
  const source = readSource(relativePath)
  for (const match of source.matchAll(/<a-(drawer|modal)\b[^>]*\bwidth\s*=\s*["'](\d+)px[^>]*>/gs)) {
    const [, kind, width] = match
    if (Number(width) > 360 && !match[0].includes('bigin-modal-content')) {
      fail(`${relativePath} has a fixed ${kind} width of ${width}px without the responsive modal contract`)
    }
  }
}
pass('No active drawer/modal uses an unbounded mobile-breaking fixed width')

assert(approvalDetail.includes('class="asset-table-scroll"'), 'Approval Detail has one shared horizontal scroll container')
assert(!/\.asset-list\s*\{[^}]*overflow-x/.test(approvalDetail), 'Approval Detail rows do not own a second horizontal scroll')
const headingColumns = approvalDetail.match(/\.asset-table-heading\s*\{[^}]*grid-template-columns:\s*([^;]+);/s)?.[1]
const rowColumns = approvalDetail.match(/\.asset-row\s*\{[^}]*grid-template-columns:\s*([^;]+);/s)?.[1]
assert(headingColumns && headingColumns === rowColumns, 'Approval Detail header and rows share the same grid columns')
assert(/\.asset-table-heading\s*\{[^}]*min-width:\s*960px/s.test(approvalDetail), 'Approval Detail header keeps the approved 960px custom-grid minimum')
assert(/\.asset-row\s*\{[^}]*min-width:\s*960px/s.test(approvalDetail), 'Approval Detail rows keep the approved 960px custom-grid minimum')
assert(!/\.queue-surface\s*\{[^}]*overflow-x/.test(readSource('views/borrow/ApprovalQueueView.vue')), 'Approval Queue does not create a toolbar/table nested horizontal scroll')

if (failures.length) {
  console.error('Responsive static audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Responsive static audit passed (${passes.length} checks).`)
}
