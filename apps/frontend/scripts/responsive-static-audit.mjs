import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '../../../')
const frontendSourceRoot = path.join(repositoryRoot, 'apps/frontend/src')

const activeViews = [
  'views/dashboard/DashboardView.vue',
  'views/administration/users/Users.vue',
  'views/administration/users/UserFormView.vue',
  'views/administration/users/UserDetailView.vue',
  'views/assets/AssetListView.vue',
  'views/assets/AssetDetailView.vue',
  'views/assets/AssetFormView.vue',
  'views/assets/AssetCatalogView.vue',
  'views/assets/AssetQrScanView.vue',
  'views/assets/AssetQrEntryView.vue',
  'views/borrowing/MyBorrowRequestsView.vue',
  'views/borrowing/BorrowRequestCreateView.vue',
  'views/borrowing/BorrowRequestDetailView.vue',
  'views/borrowing/ApprovalQueueView.vue',
  'views/borrowing/ApprovalDetailView.vue',
  'views/borrowing/HandoverReturnView.vue',
  'views/borrowing/BorrowingActivityView.vue',
  'views/borrowing/BorrowingActivityDetailView.vue',
  'views/asset-issues/AssetIssueListView.vue',
  'views/asset-issues/AssetIssueDetailView.vue',
  'views/administration/AdministrationIndexView.vue',
  'views/administration/registration-requests/RegistrationRequestListView.vue',
  'views/administration/registration-requests/RegistrationRequestDetailView.vue',
  'views/administration/roles/RoleListView.vue',
  'views/administration/roles/RoleFormView.vue',
  'views/notifications/NotificationCenterView.vue',
  'views/profile/ProfileView.vue',
  'views/auth/LoginView.vue',
  'views/auth/RegistrationRequestCreateView.vue',
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
const appTable = readSource('components/common/AppTable.vue')
const approvalDetail = readSource('views/borrowing/ApprovalDetailView.vue')
const assetList = readSource('views/assets/AssetListView.vue')
const assetDetail = readSource('views/assets/AssetDetailView.vue')
const borrowingActivity = readSource('views/borrowing/BorrowingActivityView.vue')
const handoverReturn = readSource('views/borrowing/HandoverReturnView.vue')
const myBorrowRequests = readSource('views/borrowing/MyBorrowRequestsView.vue')
const vendors = readSource('views/vendors/VendorListView.vue')
const assetIdentityUtility = readSource('utils/asset-identity.js')
const assetIdentityComponent = readSource('components/assets/AssetIdentity.vue')
const fullWidthListShells = [
  ['views/administration/departments/DepartmentListView.vue', 'department-page'],
  ['views/administration/registration-requests/RegistrationRequestListView.vue', 'admin-page'],
  ['views/assets/AssetCatalogView.vue', 'catalog-page'],
  ['views/asset-issues/AssetIssueListView.vue', 'issue-list-page'],
  ['views/borrowing/ApprovalQueueView.vue', 'queue-page'],
  ['views/borrowing/BorrowingActivityView.vue', 'history-page'],
  ['views/borrowing/HandoverReturnView.vue', 'fulfillment-page'],
  ['views/borrowing/MyBorrowRequestsView.vue', 'request-list-page'],
  ['views/vendors/VendorListView.vue', 'vendor-page'],
  ['views/notifications/NotificationCenterView.vue', 'notification-page'],
]

const assetIdentityRenderers = [
  'views/assets/AssetListView.vue',
  'views/assets/AssetDetailView.vue',
  'views/borrowing/BorrowRequestCreateView.vue',
  'views/borrowing/BorrowRequestDetailView.vue',
  'views/borrowing/ApprovalDetailView.vue',
  'views/borrowing/HandoverReturnView.vue',
  'views/borrowing/BorrowingActivityView.vue',
  'views/borrowing/BorrowingActivityDetailView.vue',
  'views/dashboard/DashboardView.vue',
  'views/asset-issues/AssetIssueListView.vue',
  'views/asset-issues/AssetIssueDetailView.vue',
]

assert(
  /min-height:\s*100vh[\s\S]*min-height:\s*100dvh/.test(workspaceLayout),
  'Workspace shell/drawer has 100vh fallback and 100dvh sizing',
)
assert(
  workspaceLayout.includes('mobile-drawer') && workspaceLayout.includes('workspace-layout__backdrop'),
  'Workspace navigation uses the shared mobile drawer and backdrop structure',
)
assert(
  appTable.includes('bigin-app-table') && responsiveCss.includes('.bigin-responsive-footer'),
  'Shared table foundation and responsive footer classes are defined',
)
assert(
  appTable.includes('bigin-app-table__action-heading') && appTable.includes('title === \'Action\''),
  'Shared table foundation centers the Action header label while preserving row alignment',
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
assert(
  assetList.includes("key: 'category'") && assetList.includes("key: 'brand'") && assetList.includes("key: 'serialNumber'"),
  'Asset List keeps Category, Brand and Seri as separate columns',
)
assert(!assetList.includes('qrCode'), 'Asset List does not render QR code metadata')
assert(
  assetIdentityUtility.includes('normalizeAssetIdentity')
    && assetIdentityUtility.includes('formatAssetIdentity')
    && assetIdentityUtility.includes('assetCode'),
  'Canonical Asset Identity normalizer and formatter are defined',
)
assert(
  assetIdentityComponent.includes('variant')
    && assetIdentityComponent.includes('Code:')
    && assetIdentityComponent.includes('Seri:'),
  'Shared AssetIdentity component renders canonical Model/Code/Seri presentation',
)
assert(
  assetList.includes('bigin-table-action-link') && assetList.includes('>View</a-button>') && assetList.includes('>Edit</a-button>'),
  'Asset List View/Edit actions use the shared blue icon-and-label convention',
)
assert(!assetDetail.includes('<a-descriptions-item label="QR code">') && assetDetail.includes('>Asset QR</a-button>'), 'Asset Detail exposes QR through the Asset QR action instead of duplicate metadata')
assert(!borrowingActivity.includes('qrCode') && !handoverReturn.includes('qrCode'), 'Borrowing Activity and Handover/Return do not render QR code metadata')
assert(myBorrowRequests.includes('title="Created"'), 'My Borrow Requests keeps the created timestamp in its own column')
assert(
  ['Contact name', 'Phone', 'Email', 'Address'].every((field) => vendors.includes(`title="${field}"`)),
  'Vendor list keeps full contact/address fields as separate columns',
)

for (const [relativePath, className] of fullWidthListShells) {
  const source = readSource(relativePath)
  const declarations = source.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`))?.[1] || ''
  assert(
    /max-width:\s*none/.test(declarations) && /margin:\s*0(?:;|\s)/.test(declarations),
    `${relativePath} uses the available workspace width for its list shell`,
  )
}

for (const relativePath of assetIdentityRenderers) {
  const source = readSource(relativePath)
  assert(
    source.includes('normalizeAssetIdentity')
      || source.includes('formatAssetIdentity')
      || source.includes('formatAssetOption')
      || source.includes('AssetIdentity'),
    `${relativePath} uses the shared Asset Identity normalizer, formatter or component`,
  )
  assert(!/serialNumber\s*\|\|\s*qrCode/.test(source), `${relativePath} has no serialNumber-to-QR fallback`)
  assert(!/QR\s*(?:code)?\s*[:]?\s*\{\{[^}]*qrCode/.test(source), `${relativePath} has no raw QR identity text`)
}

assert(!/Asset\s*#\$\{?history\.detailId/.test(readSource('views/dashboard/DashboardView.vue')), 'Dashboard Recent Activity has no synthetic Asset #detailId fallback')
assert(!assetDetail.includes('<AssetIdentity'), 'Asset Detail does not add a shared identity component beside dedicated metadata fields')
assert(!readSource('views/asset-issues/AssetIssueListView.vue').includes('`Asset ${record.assetId}`'), 'Asset Issues List has no synthetic asset identity fallback')
assert(!readSource('views/asset-issues/AssetIssueDetailView.vue').includes('`Asset ${issue.assetId}`'), 'Asset Issues Detail has no synthetic asset identity fallback')
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
  const hasAppTable = /<AppTable(?:\s|>)/.test(source)
  const hasDirectTable = /<a-table(?:\s|>)/.test(source)
  if (!hasAppTable && !hasDirectTable) continue

  if (hasAppTable) {
    assert(source.includes('AppTable'), `${relativePath} uses the shared AppTable foundation`)
    assert(!source.includes('max-content'), `${relativePath} delegates horizontal-scroll policy to AppTable`)
    if (source.includes('scroll-mode="intentional"')) {
      pass(`${relativePath} documents intentional horizontal scrolling`)
    } else {
      pass(`${relativePath} keeps the default responsive AppTable mode`)
    }
  } else {
    assert(
      /:scroll\s*=\s*["'][^>]*x:\s*["']?['"]?max-content['"][^>]*["']/.test(source),
      `${relativePath} uses an approved native max-content scrolling exception`,
    )
  }
}

const minWidthSelectorPattern = /(page|toolbar|footer|surface)/i
for (const relativePath of activeViews) {
  if (relativePath === 'views/borrowing/ApprovalDetailView.vue') continue
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
assert(!/\.queue-surface\s*\{[^}]*overflow-x/.test(readSource('views/borrowing/ApprovalQueueView.vue')), 'Approval Queue does not create a toolbar/table nested horizontal scroll')

if (failures.length) {
  console.error('Responsive static audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Responsive static audit passed (${passes.length} checks).`)
}
