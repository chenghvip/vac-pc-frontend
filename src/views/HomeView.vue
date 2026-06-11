<template>
  <el-dialog v-model="sqlDataDialog" :title="$t('home.previewData')"
             style="width: 75%; text-align: center;">

    <div style="height: 460px;">
      <el-auto-resizer>
        <template #default="{ height, width }">
          <el-table-v2
              :columns="generateTableColumns()"
              :data="previewSqlData()"
              :width="width"
              :height="height"
              :row-height="46"
              :header-height="46"
              fixed
          />
        </template>
      </el-auto-resizer>
    </div>
  </el-dialog>

  <el-dialog
      v-model="sqlDialogVisible"
      :title="$t('home.sqlRecord')"
      width="80%"
      style="text-align: center;"
      @close="closeSqlDialog">
    <el-table :data="sqlList"
              height="350px"
              tooltip-effect="light"
    >
      <el-table-column prop="sqlText" label="SQL" min-width="140" show-overflow-tooltip/>
      <el-table-column prop="executeResult" align="center" :label="$t('home.result')" width="80">
        <template #default="scope">
          <el-tag v-if="scope.row.executeResult"
                  type="success"
                  color="#67C23A"
                  style="border: none; color: white;">
            {{ $t('home.success') }}
          </el-tag>
          <el-tag v-else
                  type="danger"
                  color="#F56C6C"
                  style="border: none; color: white;">
            {{ $t('home.fail') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="exceptionInfo" :label="$t('home.error')" min-width="120" show-overflow-tooltip/>
      <el-table-column :label="$t('home.operation')" width="80">
        <template #default="scope">
          <!-- 编辑按钮 -->
          <el-button
              type="primary"
              link
              @click="executeSqlRecord(scope.row)"
          >
            <span>{{ $t('home.query') }}</span>
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>

  <!--  搜索弹框-->
  <el-dialog
      v-model="searchDialogVisible"
      width="600px"
      class="search-dialog"
      @close="closeSearchDialog"
  >
    <div class="search-container">
      <el-input v-model="search" @input="handleSearchInput" class="search-input" :placeholder="$t('home.searchChat')">
        <template #prefix>
          <el-icon>
            <Search/>
          </el-icon>
        </template>
      </el-input>

      <div v-if="!search" class="new-chat" @click="newChat">{{ $t('home.newChat') }}</div>
      <div class="search-content" v-if="!search">
        <template v-for="(group, groupName) in groupedSearchChats" :key="groupName">
          <div class="search-header">{{ groupName }}</div>
          <div
              v-for="chat in group"
              :key="chat.chatId"
              class="search-title"
              @click="selectChat(chat)"
          >
            <span v-html="chat.chatTitle"></span>
          </div>
        </template>
        <div v-if="Object.keys(groupedSearchChats).length === 0"
             style="color: #999; text-align: center; padding: 20px;">
          {{ $t('home.searchResultEmpty') }}
        </div>
      </div>
      <div class="search-content" v-else>
        <template v-if="searchChats.length > 0">
          <div
              v-for="(chat, index) in searchChats"
              :key="chat.chatId"
              @click="selectChat(chat)"
          >
            <div class="search-title">
              <span v-html="chat.chatTitle"></span>
              <div style="font-size: 12px" v-html="chat.questions[0]"></div>
            </div>

          </div>
        </template>
        <template v-else>
          <div style="padding-top: 8px;">{{ $t('home.searchResultEmpty') }}</div>
        </template>
      </div>
    </div>
  </el-dialog>

  <!-- 导出对话弹窗 -->
  <el-dialog
      v-model="exportDialogVisible"
      :title="$t('home.downloadChat')"
      width="600px"
      @close="closeExportDialog"
  >
    <div>
      <div class="export-section">
        <div>{{ $t('home.selectDownloadRange') }}</div>
        <el-radio-group v-model="exportRange">
          <el-radio label="all">{{ $t('home.allMessage') }} ({{ currentMessages.length }})</el-radio>
          <el-radio label="custom">{{ $t('home.customize') }}</el-radio>
        </el-radio-group>
      </div>

      <div v-if="exportRange === 'custom'">
        <div>{{ $t('home.selectDownloadMessages') }}</div>
        <div class="message-selection">
          <div
              v-for="(msg, index) in currentMessages"
              :key="index"
              class="message-select-item"
              :class="{ selected: selectedMessages.includes(index) }"
          >
            <el-checkbox
                :checked="selectedMessages.includes(index)"
                @click.stop="toggleMessageSelection(index)"
            >
              <span>
                <span>{{ msg.type === 'user' ? $t('home.me') : 'AI' }}:</span>
                {{ msg.content.substring(0, 40) }}{{ msg.content.length > 40 ? '...' : '' }}
              </span>
            </el-checkbox>
          </div>
        </div>
      </div>

      <div class="export-section">
        <div class="section-title">{{ $t('home.selectDownloadFormat') }}</div>
        <el-radio-group v-model="exportFormat" class="export-format">
          <el-radio label="word">Word</el-radio>
          <el-radio label="image">{{ $t('home.image') }}(PNG)</el-radio>
          <el-radio label="txt">TXT</el-radio>
        </el-radio-group>
      </div>

      <div class="export-section">
        {{ $t('home.download') }}
        <span>{{ exportRange === 'all' ? currentMessages.length : selectedMessages.length }}</span>
        {{ $t('home.message') }}
      </div>
    </div>
    <template #footer>
      <el-button @click="closeExportDialog">{{ $t('home.cancel') }}</el-button>
      <el-button type="primary" @click="confirmDownload" :loading="exporting">
        {{ exporting ? $t('home.downloading') : $t('home.download') }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 重命名对话弹窗 -->
  <el-dialog
      v-model="renameDialogVisible"
      :title="$t('home.editChatName')"
      width="500px"
      @close="closeRenameDialog"
  >
    <el-form :model="renameForm">
      <el-form-item>
        <el-input
            v-model="renameForm.title"
            :rows="3"
            type="textarea"
            :placeholder="$t('home.enter')"
            @keydown.enter.prevent
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeRenameDialog">{{ $t('home.cancel') }}</el-button>
      <el-button type="primary" @click="confirmRename">{{ $t('home.confirm') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog
      v-model="descDialogVisible"
      :title="$t('home.viewDesc')"
      width="500px"
      @close="closeDescDialog"
  >
    <el-form :model="descForm" label-width="100px">
      <el-form-item :label="$t('home.descType')">
        <el-input disabled :value="$t('home.default')"></el-input>
      </el-form-item>
      <el-form-item :label="$t('home.descContent')">
        <el-input
            v-model="descForm.describeContent"
            type="textarea"
            :rows="4"
            disabled
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDescDialog">{{ $t('home.cancel') }}</el-button>
    </template>
  </el-dialog>

  <div class="chat-container">
    <!-- 左侧对话列表 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-content">
        <div class="logo">
          <img alt="logo" src="../assets/logo.png" class="vac-logo" @click="createNewChat"/>
          <div class="toggle-sidebar-btn" @click="toggleSidebar" :title="$t('home.collapse')">
            <el-icon>
              <ArrowLeft/>
            </el-icon>
          </div>
        </div>
        <el-input
            class="search-chat"
            :placeholder="$t('home.search')"
            readonly
            @click="openSearch">
          <template #prefix>
            <el-icon>
              <Search/>
            </el-icon>
          </template>
        </el-input>
        <el-button class="new-chat-btn" @click="createNewChat">
          <el-icon>
            <Plus/>
          </el-icon>
          <span>{{ $t('home.newChat') }}</span>
        </el-button>
        <div class="conversation-section" @scroll="handleScroll">
          <!-- 置顶对话部分 -->
          <div class="section-header" v-if="pinnedConversations.length > 0">
            <span>{{ $t('home.top') }}</span>
          </div>
          <div class="conversation-list">
            <div
                v-for="conv in pinnedConversations"
                :key="conv.chatId"
                class="conversation-item"
                :class="{ active: activeConversationId === conv.chatId }"
                @click="selectConversation(conv.chatId)"
            >
              <div class="conversation-content">
                <div class="conversation-title" ref="titleRef">{{ conv.chatTitle }}</div>
              </div>
              <div class="menu-dropdown" @click.stop>
                <el-dropdown @command="handleDropdownCommand" trigger="click"
                             @visible-change="handleDropdownVisibleChange(conv.chatId)">
                  <div class="menu-btn" :title="$t('home.moreOperation')">⋮</div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Edit/>
                        </el-icon>
                        <span>{{ $t('home.rename') }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="unpin" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Bottom/>
                        </el-icon>
                        <span>{{ $t('home.unTop') }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Delete/>
                        </el-icon>
                        <span>{{ $t('home.delete') }}</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <!-- 最近对话部分 -->
          <div class="section-header">
            <span>{{ $t('home.recent') }}</span>
          </div>
          <div class="conversation-list">
            <div
                v-for="(conv, index) in unpinnedConversations"
                :key="conv.chatId"
                class="conversation-item"
                :class="{ active: activeConversationId === conv.chatId }"
                @click="selectConversation(conv.chatId)"
            >
              <div class="conversation-content">
                <div class="conversation-title">{{ conv.chatTitle }}</div>
              </div>
              <div class="menu-dropdown" @click.stop>
                <el-dropdown @command="handleDropdownCommand" trigger="click"
                             @visible-change="handleDropdownVisibleChange(conv.chatId)">
                  <div class="menu-btn" :title="$t('home.moreOperation')">⋮</div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Edit/>
                        </el-icon>
                        <span>{{ $t('home.rename') }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="pin" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Top/>
                        </el-icon>
                        <span>{{ $t('home.top') }}</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" :data="conv.mcpChatSessionId">
                        <el-icon>
                          <Delete/>
                        </el-icon>
                        <span>{{ $t('home.delete') }}</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>
        <div class="user-section">
          <!-- 用户信息部分的代码 -->
          <div class="user-info">
            <div class="user-avatar">👤</div>
            <div class="user-name">{{ nickname }}</div>
            <el-dropdown @command="handleUserDropdownCommand" trigger="click"
                         :popper-options="{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [-20, 20]  // [水平偏移, 垂直偏移]
            }
          }
        ]
      }">
            <span class="el-dropdown-link">
              <div class="logout-btn" :title="$t('home.userMenu')">...</div>
            </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>
                    <el-dropdown
                        trigger="hover"
                        placement="right"
                        :popper-options="{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 20]  // [水平偏移, 垂直偏移]
            }
          }
        ]
      }">
                      <span>{{ $t('home.toggle') }}</span>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item @click="toggleLocale('zh')">{{ $t('home.chinese') }}</el-dropdown-item>
                          <el-dropdown-item @click="toggleLocale('zh_tw')">{{ $t('home.chinese_tw') }}
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </el-dropdown-item>
                  <el-dropdown-item command="logout">{{ $t('home.loginOut') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>
    <!-- 展开按钮 - 只在侧边栏收起时显示 -->
    <div class="expand-btn-wrapper" v-if="sidebarCollapsed">
      <div @click="toggleSidebar" :title="$t('home.expand')">
        <el-icon :title="$t('home.expand')">
          <ArrowRight/>
        </el-icon>
      </div>
    </div>
    <!-- 中间内容区域 -->
    <div class="main-content"
         :style="{ width: sidebarCollapsed ? 'calc(100vw - 160px)' : 'calc(100vw - 240px)' }">
      <div v-if="currentMessages.length > 0" class="chat-actions" @click="openExportDialog">
        <el-icon :title="$t('home.download')">
          <Download/>
        </el-icon>
      </div>
      <div class="chat-header">
        <div class="chat-title">
          <h2>{{ chatTitle }}</h2>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <!-- 欢迎消息 -->
        <div v-if="currentMessages.length === 0" class="welcome-message">
          <h1>Hi, {{ nickname }}, {{ $t('home.welcome') }}!</h1>
        </div>

        <!-- 消息列表 -->
        <div v-else class="message-list">
          <div
              v-for="(msg, index) in currentMessages"
              :key="index"
              class="message-wrapper"
          >
            <!-- 用户问题 -->
            <div v-if="msg.type === 'user'" class="message user" style="position: relative;">
              <div class="user-message" style="position: relative;">
                <div class="message-text">{{ msg.content }}</div>
                <div style=" color: #409eff; display: flex; justify-content: flex-end; gap: 20px; margin-top: 5px;">
                  <el-tooltip :content="copiedIndex === index ? $t('home.copied') : $t('home.copy')" placement="bottom">
                    <span style="cursor: pointer;">
                      <el-icon>
                        <Check v-if="copiedIndex === index"/>
                        <CopyDocument v-else @click.stop="handleCopy(msg.content, index)"/>
                      </el-icon>
                    </span>
                  </el-tooltip>
                  <el-tooltip :content="$t('home.querySqlRecord')" placement="bottom">
                    <span style="cursor: pointer;" @click.stop="handleQuerySql(msg)">
                      <el-icon><Search/></el-icon>
                    </span>
                  </el-tooltip>
                </div>
              </div>
            </div>

            <!-- AI回复 -->
            <div v-else class="message ai">
              <div class="ai-message">
                <markdown-renderer :content="msg.content" class="message-text"></markdown-renderer>
              </div>
            </div>
          </div>

          <!-- 正在输入指示器 -->
          <div v-if="thinkingConversations[activeConversationId]" class="message-wrapper">
            <div class="message ai">
              <div class="thinking">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="thinking-text">{{ $t('home.thinking') }}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入框 -->
      <div class="input-area">
        <div class="textarea-wrapper">
            <textarea
                ref="messageInput"
                v-model="userInput"
                :placeholder="`${$t('home.sendMsg')}...`"
                @keydown.enter.exact.prevent="sendMessage"
                @compositionstart="isComposing = true"
                @compositionend="isComposing = false"
                @input="adjustHeight(200)"
            />
          <div class="textarea-controls">
            <div class="control-group">
              <el-select
                  v-model="selectedDs"
                  placeholder="请选择数据源"
                  class="control-select"
                  @change="handleDataSourceChange"
              >
                <el-option
                    v-for="source in dataSources"
                    :key="source.driverMetadataId"
                    :value="source.driverMetadataId"
                    :label="source.dsName"
                    class="control-option"
                >
                  <div class="control-option-content">
                    <span>{{ source.dsName }}</span>
                    <div class="meta-data-desc" @click.stop="openDescDialog(source)"
                         v-if="source.metadataDescribeBeans && source.metadataDescribeBeans.length > 0">
                        <span class="meta-data-desc-content">
                          {{ getDefaultDescribeContent(source.metadataDescribeBeans) }}
                        </span>
                    </div>
                  </div>
                </el-option>
              </el-select>
              <el-select
                  v-model="selectedSchema"
                  placeholder="请选择模式"
                  class="control-select"
                  @change="handleSchemaChange"
              >
                <el-option
                    v-for="model in schemas"
                    :key="model.schemaId"
                    :label="model.schemaName"
                    :value="model.schemaId"
                    class="control-option"
                >
                  <div class="control-option-content">
                    <span>{{ model.schemaName }}</span>
                    <div class="meta-data-desc" @click.stop="openDescDialog(model)"
                         v-if="model.metadataDescribeBeans && model.metadataDescribeBeans.length > 0">
                        <span class="meta-data-desc-content">
                          {{ getDefaultDescribeContent(model.metadataDescribeBeans) }}
                        </span>
                    </div>
                  </div>
                </el-option>
              </el-select>
            </div>
            <div class="send-btn-group">
              <el-tooltip v-if="!thinkingConversations[activeConversationId]"
                          :content="$t('home.sendMsg')" placement="top">
                <el-button
                    class="send-btn sendThinking"
                    @click="sendMessage()"
                    :disabled="!userInput">
                  {{ '➤' }}
                </el-button>
              </el-tooltip>
              <el-tooltip v-else
                          :content="$t('home.stopComp')" placement="top">
                <el-button
                    class="send-btn sendThinking"
                    @click="stopGeneration()">
                  {{ '⏹' }}
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>
        <div class="input-footer">
          <span class="footer-text">{{ $t('home.AiContent') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {removeToken} from "../utils/token";
import {post, sendMessagePost} from '../utils/api'
import i18n from '@/i18n'
import {v4 as uuidv4} from 'uuid';
import {ElMessage, ElSelectV2} from 'element-plus'
import {ArrowLeft, ArrowRight, Plus, Edit, Delete, Top, Bottom, Search, Download, CopyDocument, Check} from '@element-plus/icons-vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import html2canvas from 'html2canvas'
import {saveAs} from 'file-saver'
import {Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType} from 'docx'
import MarkdownFactory from '@/utils/markdownFactory'

export default {
  name: 'HomeView',
  components: {
    ArrowLeft,
    ArrowRight,
    Plus,
    Edit,
    Delete,
    Top,
    Bottom,
    Search,
    CopyDocument,
    Check,
    Download,
    MarkdownRenderer
  },
  data() {
    return {
      userInput: '',
      thinkingConversations: {},
      conversations: [],
      activeConversationId: '',
      sidebarCollapsed: false,
      //分页相关数据
      loading: false,
      pageNo: 1,
      pageSize: 100,
      totalCount: 0,
      totalPage: 0,
      // 数据源下拉框相关
      selectedDs: '',
      selectedDsName: '',
      dataSources: [], // 数据源列表
      // 模式下拉框相关
      selectedSchema: '',
      selectedSchemaName: '',
      schemas: [], // 模式列表
      chatTitle: '',
      nickname: localStorage.getItem('nickName') || '未知用户',
      isComposing: false,  // 输入法状态标识,解决mac输入法下按enter键直接发送消息bug
      abortControllers: {},
      sessionCaches: {},  // 每个对话的独立缓存
      cacheAccessTimes: {}, // 每个会话访问时间,用于判断删除缓存会话
      cacheConfig: {
        maxConversations: 10,  // 最大缓存对话数，超过该值时，将删除最久之前访问的会话
      },
      cacheCleanupTimer: null,
      //注释管理弹窗
      descDialogVisible: false,
      descForm: {
        describeType: '',
        describeContent: ''
      },
      renameDialogVisible: false,
      renameForm: {
        title: ''
      },
      renameTargetSessionId: null, // 用于保存要重命名的会话 ID
      search: '',
      searchDialogVisible: false,
      searchChats: [],
      searchDebounceTimer: null,
      // 导出相关
      exportDialogVisible: false,
      exportRange: 'all', // 'all' 或 'custom'
      exportFormat: 'word', // 'txt', 'word', 'pdf', 'image'
      selectedMessages: [], // 选中的消息索引
      exporting: false,
      copiedIndex: null,
      sqlList: [],
      sqlDialogVisible: false,

      sqlDataDialog: false,
      sqlData: [],
    }
  },

  computed: {
    // 计算属性来分离置顶和非置顶对话
    pinnedConversations() {
      return this.conversations.filter(conv => conv.pinned);
    },
    unpinnedConversations() {
      return this.conversations.filter(conv => !conv.pinned);
    },
    currentMessages() {
      return this.sessionCaches[this.activeConversationId] || [];
    },
    // 根据时间分组搜索到的对话
    groupedSearchChats() {
      if (!this.searchChats || this.searchChats.length === 0) {
        return {};
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      // 获取本周的开始时间（周一）
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 如果是周日 (0),则减去 6 天，否则减去 (dayOfWeek - 1) 天
      weekStart.setDate(today.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);

      const groups = {
        'today': [],
        'week': [],
        'earlier': []
      };

      this.searchChats.forEach(chat => {
        // 处理时间戳格式（如 1773042265787），确保转换为数字
        const createTime = new Date(Number(chat.createTime));

        if (createTime >= today) {
          // 今日
          groups['today'].push(chat);
        } else if (createTime >= weekStart) {
          // 本周（从周一开始）
          groups['week'].push(chat);
        } else {
          // 更早
          groups['earlier'].push(chat);
        }
      });

      // 过滤掉空数组并映射为国际化文本
      const result = {};
      for (const [key, value] of Object.entries(groups)) {
        if (value.length > 0) {
          // 根据 key 获取对应的国际化文本
          const i18nKey = `home.${key}`;
          result[i18n.global.t(i18nKey)] = value;
        }
      }

      return result;
    },
  },

  mounted() {
    this.fetchConversations(); // 获取对话列表
    this.fetchDataSources(); // 获取数据源列表
    this.sessionCachesCleanUp(); // 初始化缓存清理
  },

  unmounted() {
    // 清理所有定时器
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
    }
    // 清理所有 AbortController
    Object.values(this.abortControllers).forEach(controller => {
      controller.abort();
    });
    // 清空缓存
    this.sessionCaches = {};
    this.cacheAccessTimes = {};
    this.abortControllers = {};
  },

  methods: {
    handleCopy(content, index) {
      // 创建临时文本框进行复制（兼容所有浏览器和环境）
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.width = '2em'
      textArea.style.height = '2em'
      textArea.style.padding = '0'
      textArea.style.border = 'none'
      textArea.style.outline = 'none'
      textArea.style.boxShadow = 'none'
      textArea.style.background = 'transparent'
      textArea.style.opacity = '0'

      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful) {
          // 设置当前复制的索引
          this.copiedIndex = index
          // 1 秒后恢复图标
          setTimeout(() => {
            this.copiedIndex = null
          }, 1000)
        }
      } catch (err) {
        console.error('复制失败:', err)
        ElMessage.error('复制失败')
      } finally {
        document.body.removeChild(textArea)
      }
    },

    async handleQuerySql(data) {
      try {
        const params = {
          chatRecordId: data.chatRecordId,
        };
        const response = await post('/mcp/sql/execute/record/list', params);
        if (response && response.code === 0) {
          if (response.data && response.data.length > 0) {
            this.sqlList = response.data;
            this.sqlDialogVisible = true;
          } else {
            ElMessage.warning(i18n.global.t('home.noSqlRecord'));
          }
        }
      } catch (error) {
        console.error('获取Sql记录失败:', error);
      }
    },
    async executeSqlRecord(data) {
      this.sqlDataDialog = true
      post('/mcp/sql/execute/record/execute', {mcpSqlExecuteRecordId: data.mcpSqlExecuteRecordId}).then(response => {
        if (response && response.code === 0) {
          this.sqlData = response.data;
        } else {
          ElMessage.error(response.message);
        }
      }).catch(error => {
        console.error('执行失败:', error);
        ElMessage.error('执行失败');
      })
    },
    closeSqlDialog() {
      this.sqlDialogVisible = false
      this.sqlList = []
    },
    generateTableColumns() {
      let customWidth = 200
      const uniqueColumns = new Set()
      // sqlData 是二维数组 [[{columnName, columnValue}], [{columnName, columnValue}]]
      // 需要从第一行数据中提取列名
      if (this.sqlData && this.sqlData.length > 0 && this.sqlData[0] && this.sqlData[0].length > 0) {
        // 获取第一行数据的所有列名
        this.sqlData[0].forEach(cell => {
          uniqueColumns.add(cell.columnName)
        })
      }
      if (uniqueColumns.size <= 4) {
        customWidth = 300
      }

      // 创建包含编号列的列定义数组
      const columns = [
        // 编号列
        {
          key: 'serialNumber',
          dataKey: 'serialNumber',
          title: i18n.global.t('home.number'),
          width: 80,
        }
      ]

      // 添加其他列
      columns.push(...Array.from(uniqueColumns).map(col => ({
        key: col,
        dataKey: col,
        title: col,
        width: customWidth, // 默认列宽
        // align: 'center'
      })))

      return columns
    },
    previewSqlData() {
      const rows = []

      // sqlData 是二维数组 [[{columnName, columnValue}], [{columnName, columnValue}]]
      // 外层数组的每个元素是一行数据
      if (!this.sqlData || !Array.isArray(this.sqlData)) {
        return []
      }

      this.sqlData.forEach((rowArray, rowIndex) => {
        const rowData = {
          // 添加编号列，从 1 开始
          serialNumber: rowIndex + 1
        }

        // rowArray 是 [{columnName, columnValue}, ...] 格式的数组
        // 提取当前行的 columnName -> value 映射
        if (rowArray && Array.isArray(rowArray)) {
          rowArray.forEach(cell => {
            rowData[cell.columnName] = cell.columnValue
          })
        }

        rows.push(rowData)
      })

      return rows
    },
    // 打开导出弹窗
    openExportDialog() {
      this.exportRange = 'all';
      this.exportFormat = 'word';
      this.selectedMessages = [];
      this.exportDialogVisible = true;
    },

    // 关闭导出弹窗
    closeExportDialog() {
      this.exportDialogVisible = false;
      this.selectedMessages = [];
    },
    // 切换消息选择状态
    toggleMessageSelection(index) {
      const pos = this.selectedMessages.indexOf(index);
      if (pos === -1) {
        this.selectedMessages.push(index);
      } else {
        this.selectedMessages.splice(pos, 1);
      }
    },
    // 确认导出
    async confirmDownload() {
      if (this.exportRange === 'custom' && this.selectedMessages.length === 0) {
        ElMessage.warning('请至少选择一条消息');
        return;
      }

      this.exporting = true;

      try {
        // 获取要导出的消息
        const messagesToExport = this.exportRange === 'all'
            ? this.currentMessages
            : this.selectedMessages.map(index => this.currentMessages[index]);

        if (messagesToExport.length === 0) {
          ElMessage.warning('没有可导出的消息');
          this.exporting = false;
          return;
        }

        // 根据格式导出
        switch (this.exportFormat) {
          case 'txt':
            await this.exportAsTxt(messagesToExport);
            break;
          case 'word':
            await this.exportAsWord(messagesToExport);
            break;
          case 'image':
            await this.exportAsImage(messagesToExport);
            break;
        }

        ElMessage.success('操作成功');
        this.closeExportDialog();
      } catch (error) {
        console.error('导出失败:', error);
        ElMessage.error('操作失败：' + error.message);
      } finally {
        this.exporting = false;
      }
    },

    // 导出为 TXT
    async exportAsTxt(messages) {
      let content = `对话：${this.chatTitle}\n`;
      content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
      content += '='.repeat(50) + '\n\n';

      messages.forEach((msg, index) => {
        const type = msg.type === 'user' ? '我' : 'AI';
        content += `[${type}] ${new Date().toLocaleString('zh-CN')}\n`;
        content += `${msg.content}\n\n`;
        content += '-'.repeat(50) + '\n\n';
      });

      const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${this.chatTitle || '对话'}_${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    // 导出为 Word 文档
    async exportAsWord(messages) {
      try {
        const children = [];

        // 添加标题
        children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: this.chatTitle || '对话记录',
                  bold: true,
                  size: 48,
                  font: 'Microsoft YaHei',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {after: 400},
            })
        );

        // 添加导出时间
        children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `导出时间：${new Date().toLocaleString('zh-CN')}`,
                  size: 24,
                  font: 'Microsoft YaHei',
                  color: '666666',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {after: 400},
            })
        );

        // 添加分隔线
        children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '═'.repeat(50),
                  size: 24,
                  font: 'Microsoft YaHei',
                }),
              ],
              spacing: {after: 400},
            })
        );

        // 添加消息内容
        messages.forEach((msg, index) => {
          const type = msg.type === 'user' ? '我' : 'AI';
          // 消息类型和时间
          children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[${type}]`,
                    bold: true,
                    size: 28,
                    font: 'Microsoft YaHei',
                    color: '333333',
                  }),
                ],
                spacing: {before: 400, after: 200},
              })
          );

          // 解析消息内容为带格式的段落块
          const contentBlocks = this.parseContentToBlocks(msg.content);
          contentBlocks.forEach(block => {
            if (block.type === 'table') {
              // 处理表格
              const tableRows = block.rows.map((row, rowIndex) =>
                  new TableRow({
                    children: row.map((cell, cellIndex) => {
                      // 单元格内容可能是多个段落
                      const cellChildren = cell.map(para =>
                          new Paragraph({
                            children: para.runs.map(run =>
                                new TextRun({
                                  text: run.text,
                                  bold: run.bold || (rowIndex === 0), // 表头加粗
                                  italics: run.italic,
                                  font: run.code ? 'Consolas' : run.font || 'Microsoft YaHei',
                                  size: run.size || 20,
                                  color: '333333',
                                  shading: run.shading,
                                })
                            ),
                            spacing: {after: 120},
                          })
                      );
                      return new TableCell({
                        children: cellChildren,
                        width: {size: 100 / row.length, type: WidthType.PERCENTAGE},
                        // 表头背景色设置
                        shading: rowIndex === 0 ? {
                          fill: 'f5f5f5', // 背景
                        } : undefined,
                      });
                    }),
                  })
              );
              children.push(
                  new Table({
                    rows: tableRows,
                    width: {size: 100, type: WidthType.PERCENTAGE},
                  })
              );
            } else if (block.type === 'heading') {
              // 处理标题
              const headingSize = 48 - (block.level * 4);
              children.push(
                  new Paragraph({
                    children: block.runs.map(run =>
                        new TextRun({
                          text: run.text,
                          bold: true,
                          size: headingSize,
                          font: 'Microsoft YaHei',
                        })
                    ),
                    spacing: {before: 300, after: 200},
                  })
              );
            } else if (block.type === 'code') {
              // 处理代码块
              children.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: block.content,
                        size: 20,
                        font: 'Consolas',
                        color: '333333',
                        shading: {fill: 'F6F8FA', color: 'auto'},
                      }),
                    ],
                    spacing: {after: 200},
                  })
              );
            } else if (block.type === 'list') {
              // 处理有序或无序列表
              block.items.forEach((item, itemIndex) => {
                if (block.ordered) {
                  // 有序列表：手动添加编号
                  const runs = [
                    new TextRun({
                      text: `${itemIndex + 1}.  `,
                      size: 24,
                      font: 'Microsoft YaHei',
                    }),
                    ...item.runs.map(run =>
                        new TextRun({
                          text: run.text,
                          bold: run.bold,
                          italics: run.italic,
                          font: run.font || 'Microsoft YaHei',
                          size: run.size || 24,
                        })
                    )
                  ];

                  children.push(
                      new Paragraph({
                        children: runs,
                        spacing: {after: 120},
                        indent: {left: 720},
                      })
                  );
                } else {
                  // 无序列表：使用项目符号
                  children.push(
                      new Paragraph({
                        children: item.runs.map(run =>
                            new TextRun({
                              text: run.text,
                              bold: run.bold,
                              italics: run.italic,
                              font: run.font || 'Microsoft YaHei',
                              size: run.size || 24,
                            })
                        ),
                        bullet: {level: 0},
                        spacing: {after: 120},
                      })
                  );
                }
              });
            } else if (block.type === 'listItem') {
              // 处理单独的列表项
              children.push(
                  new Paragraph({
                    children: block.runs.map(run =>
                        new TextRun({
                          text: run.text,
                          bold: run.bold,
                          italics: run.italic,
                          font: run.font || 'Microsoft YaHei',
                          size: run.size || 24,
                        })
                    ),
                    bullet: {level: 0},
                    spacing: {after: 120},
                  })
              );
            } else {
              // 处理普通段落（支持换行符）
              const paragraphs = this.createParagraphsWithLineBreaks(block.runs);
              paragraphs.forEach((para, index) => {
                children.push(
                    new Paragraph({
                      children: para.runs.map(run =>
                          new TextRun({
                            text: run.text,
                            bold: run.bold,
                            italics: run.italic,
                            font: run.code ? 'Consolas' : run.font || 'Microsoft YaHei',
                            size: run.size || 24,
                            color: run.color,
                            underline: run.underline,
                          })
                      ),
                      spacing: {after: index === paragraphs.length - 1 ? 200 : 0},
                    })
                );
              });
            }
          });

          // 消息之间的分隔线
          if (index < messages.length - 1) {
            children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '─'.repeat(50),
                      size: 20,
                      color: 'CCCCCC',
                    }),
                  ],
                  spacing: {before: 300, after: 300},
                })
            );
          }
        });

        const doc = new Document({
          sections: [{properties: {}, children}],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${this.chatTitle || '对话'}_${Date.now()}.docx`);
      } catch (error) {
        console.error('导出 Word 失败:', error);
        throw new Error('导出 Word 失败：' + error.message);
      }
    },
    // 处理包含换行符的文本，将其拆分为多个段落
    createParagraphsWithLineBreaks(runs) {
      const paragraphs = [];
      let currentRuns = [];

      runs.forEach(run => {
        if (run.text && run.text.includes('\n')) {
          // 如果文本包含换行符，需要拆分
          const lines = run.text.split('\n');

          lines.forEach((line, index) => {
            if (line || index < lines.length - 1) {
              currentRuns.push({
                ...run,
                text: line
              });
            }

            // 如果不是最后一行，创建一个新段落
            if (index < lines.length - 1) {
              paragraphs.push({runs: [...currentRuns]});
              currentRuns = [];
            }
          });
        } else {
          currentRuns.push(run);
        }
      });

      // 添加最后一段
      if (currentRuns.length > 0) {
        paragraphs.push({runs: currentRuns});
      }

      return paragraphs;
    },
    // 将 Markdown 内容解析为带格式的块（返回数组）
    parseContentToBlocks(content) {
      if (!content) return [];

      const md = MarkdownFactory.getInstance();
      if (!md) return [{type: 'paragraph', runs: [{text: content}]}];

      // 渲染为 HTML
      const rendered = md.render(content);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rendered;

      const blocks = [];
      const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'ul', 'ol', 'table'];

      // 递归处理 DOM 节点
      const processNode = (node, parentStyles = {}, insideLi = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text.trim()) {
            return [{text, ...parentStyles}];
          }
          return [];
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          const styles = {...parentStyles};

          // 根据标签应用样式
          switch (tagName) {
            case 'strong':
            case 'b':
              styles.bold = true;
              break;
            case 'em':
            case 'i':
              styles.italic = true;
              break;
            case 'u':
              styles.underline = true;
              break;
            case 'code':
              if (!node.parentNode || node.parentNode.tagName !== 'PRE') {
                styles.code = true;
                styles.font = 'Consolas';
                styles.size = 20;
              }
              break;
            case 'a':
              styles.link = node.getAttribute('href');
              styles.color = '0563C1';
              styles.underline = true;
              break;
            case 'span':
              // 可以进一步解析 style 属性
              const style = node.getAttribute('style');
              if (style) {
                // 简单的样式解析
                if (style.includes('font-weight: bold') || style.includes('font-weight:600') || style.includes('font-weight:700')) {
                  styles.bold = true;
                }
                if (style.includes('font-style: italic')) {
                  styles.italic = true;
                }
                if (style.includes('text-decoration: underline')) {
                  styles.underline = true;
                }
              }
              break;
          }

          // 块级元素处理
          if (blockTags.includes(tagName)) {
            if (insideLi) {
              // 在 li 内部，不创建全局块，返回子节点 runs
              const runs = [];
              Array.from(node.childNodes).forEach(child => {
                runs.push(...processNode(child, styles, true));
              });
              return runs;
            } else {
              // 不在 li 内部，创建全局块
              const childRuns = [];
              Array.from(node.childNodes).forEach(child => {
                childRuns.push(...processNode(child, styles, false));
              });

              if (childRuns.length === 0) return [];

              if (tagName.match(/^h[1-6]$/)) {
                // 标题块
                blocks.push({
                  type: 'heading',
                  level: parseInt(tagName.charAt(1)),
                  runs: childRuns,
                });
              } else if (tagName === 'pre') {
                // 代码块
                blocks.push({
                  type: 'code',
                  content: node.textContent,
                });
              } else if (tagName === 'ul' || tagName === 'ol') {
                // 列表块
                const items = [];
                Array.from(node.children).forEach(li => {
                  if (li.tagName === 'LI') {
                    const itemRuns = [];
                    // 遍历 li 的所有子节点
                    const liChildren = Array.from(li.childNodes);
                    liChildren.forEach((child, idx) => {
                      const childRuns = processNode(child, styles, true);
                      if (childRuns.length > 0) {
                        itemRuns.push(...childRuns);
                        // 如果当前子节点是块级元素且不是最后一个，添加换行标记
                        const isBlock = child.nodeType === Node.ELEMENT_NODE &&
                            blockTags.includes(child.tagName.toLowerCase());
                        if (isBlock && idx < liChildren.length - 1) {
                          // 检查下一个节点是否也是块级元素或文本
                          const nextNode = liChildren[idx + 1];
                          const nextIsBlock = nextNode.nodeType === Node.ELEMENT_NODE &&
                              blockTags.includes(nextNode.tagName.toLowerCase());
                          if (nextIsBlock || (nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent.trim())) {
                            itemRuns.push({break: true});
                          }
                        }
                      }
                    });
                    if (itemRuns.length > 0) {
                      items.push({runs: itemRuns});
                    }
                  }
                });
                blocks.push({
                  type: 'list',
                  ordered: tagName === 'ol',
                  items,
                });
              } else if (tagName === 'table') {
                // 表格块
                const rows = this.parseTableWithFormat(node);
                blocks.push({
                  type: 'table',
                  rows,
                });
              } else {
                // 普通段落
                blocks.push({
                  type: 'paragraph',
                  runs: childRuns,
                });
              }
              return []; // 子节点已作为块处理完毕，不再向上返回
            }
          } else {
            // 内联元素：继续递归，返回 Runs
            const runs = [];
            Array.from(node.childNodes).forEach(child => {
              runs.push(...processNode(child, styles, insideLi));
            });
            return runs;
          }
        }
        return [];
      };

      // 遍历根节点的子节点
      Array.from(tempDiv.childNodes).forEach(node => {
        processNode(node, {}, false);
      });

      // 合并相邻的纯文本 runs
      const mergeTextRuns = (runs) => {
        const merged = [];
        for (let i = 0; i < runs.length; i++) {
          const run = runs[i];
          if (i > 0 && !run.break && !merged[merged.length - 1].break &&
              JSON.stringify({...run, text: ''}) === JSON.stringify({...merged[merged.length - 1], text: ''})) {
            // 如果样式相同且都不是换行标记，合并文本
            merged[merged.length - 1].text += run.text;
          } else {
            merged.push({...run});
          }
        }
        return merged;
      };

      // 对列表项中的 runs 进行合并优化
      blocks.forEach(block => {
        if (block.type === 'list' && block.items) {
          block.items = block.items.map(item => ({
            runs: mergeTextRuns(item.runs)
          }));
        } else if (block.type === 'paragraph' && block.runs) {
          block.runs = mergeTextRuns(block.runs);
        } else if (block.type === 'heading' && block.runs) {
          block.runs = mergeTextRuns(block.runs);
        }
      });

      return blocks;
    },
    // 解析表格并保留单元格内的格式
    parseTableWithFormat(tableElement) {
      const rows = [];
      const trElements = tableElement.querySelectorAll('tr');

      trElements.forEach(tr => {
        const cells = [];
        const cellElements = tr.querySelectorAll('th, td');

        cellElements.forEach(cell => {
          // 单元格内容可能是多个段落
          const cellBlocks = [];
          Array.from(cell.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              if (node.textContent.trim()) {
                cellBlocks.push({
                  type: 'paragraph',
                  runs: [{text: node.textContent}],
                });
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // 简单处理：将单元格内的元素作为段落，可扩展为递归解析
              const runs = [];
              Array.from(node.childNodes).forEach(child => {
                runs.push(...this.processInlineNode(child, {}));
              });
              if (runs.length) {
                cellBlocks.push({type: 'paragraph', runs});
              }
            }
          });
          cells.push(cellBlocks);
        });

        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      return rows;
    },

    // 处理内联节点返回 Runs
    processInlineNode(node, styles) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) {
          return [{text, ...styles}];
        }
        return [];
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const newStyles = {...styles};
        switch (tagName) {
          case 'strong':
          case 'b':
            newStyles.bold = true;
            break;
          case 'em':
          case 'i':
            newStyles.italic = true;
            break;
          case 'u':
            newStyles.underline = true;
            break;
          case 'code':
            newStyles.code = true;
            newStyles.font = 'Consolas';
            newStyles.size = 20;
            break;
          case 'a':
            newStyles.link = node.getAttribute('href');
            newStyles.color = '0563C1';
            newStyles.underline = true;
            break;
        }
        const runs = [];
        Array.from(node.childNodes).forEach(child => {
          runs.push(...this.processInlineNode(child, newStyles));
        });
        return runs;
      }
      return [];
    },

    async exportAsImage(messages) {
      // 创建临时容器
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-9999px';
      container.style.width = '1200px';
      container.style.padding = '40px';
      container.style.background = 'white';
      container.style.fontFamily = 'Arial, Microsoft YaHei, sans-serif';
      container.style.boxSizing = 'border-box';

      // 添加全局样式（使 Markdown 渲染效果与网页一致）
      const style = document.createElement('style');
      style.textContent = `
    .markdown-body {
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    .markdown-body h1 { font-size: 20px; margin: 0.5em 0; }
    .markdown-body h2 { font-size: 18px; margin: 0.5em 0; }
    .markdown-body h3 { font-size: 16px; margin: 0.5em 0; }
    .markdown-body p { margin: 0.5em 0; }
    .markdown-body ul, .markdown-body ol { margin: 0.5em 0; padding-left: 20px; }
    .markdown-body li { margin: 0.2em 0; }
    .markdown-body code {
      background: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 0.9em;
    }
    .markdown-body pre {
      background: #f6f8fa;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      max-width: 100%;
    }
    .markdown-body pre code {
      background: none;
      padding: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .markdown-body blockquote {
      border-left: 4px solid #ddd;
      margin: 0.5em 0;
      padding-left: 16px;
      color: #666;
    }
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }
    .markdown-body th, .markdown-body td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
      white-space: normal;
      word-wrap: break-word;
    }
    .markdown-body th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .markdown-body tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    .markdown-body a {
      color: #0366d6;
      text-decoration: none;
    }
    .markdown-body a:hover {
      text-decoration: underline;
    }
  `;
      container.appendChild(style);

      // 构建头部
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '40px';
      header.innerHTML = `
    <h2 style="color: #333; margin: 0; font-size: 24px;">${this.chatTitle || '对话记录'}</h2>
    <p style="color: #999; font-size: 14px; margin: 10px 0 30px;">导出时间：${new Date().toLocaleString('zh-CN')}</p>
    <hr style="border: none; border-top: 2px solid #eee;">
  `;
      container.appendChild(header);

      // 获取 Markdown 渲染器实例
      const md = MarkdownFactory.getInstance();

      // 添加消息
      messages.forEach((msg, index) => {
        const align = msg.type === 'user' ? 'flex-end' : 'flex-start';
        const bgColor = msg.type === 'user' ? '#e4edfd' : '';

        const messageWrapper = document.createElement('div');
        messageWrapper.style.display = 'flex';
        messageWrapper.style.justifyContent = align;
        messageWrapper.style.marginBottom = '20px';

        const bubble = document.createElement('div');
        bubble.style.backgroundColor = bgColor;
        bubble.style.padding = '12px 16px';
        bubble.style.borderRadius = '12px';
        bubble.style.maxWidth = '100%';
        bubble.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';

        // 消息内容容器（应用 Markdown 样式）
        const contentDiv = document.createElement('div');
        contentDiv.className = 'markdown-body';
        if (md) {
          contentDiv.innerHTML = md.render(msg.content);
        } else {
          // 降级处理：显示纯文本（保留换行）
          contentDiv.style.whiteSpace = 'pre-wrap';
          contentDiv.textContent = msg.content;
        }
        bubble.appendChild(contentDiv);

        messageWrapper.appendChild(bubble);
        container.appendChild(messageWrapper);
      });

      document.body.appendChild(container);

      try {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: false,
          windowWidth: 1200,
          windowHeight: container.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const tables = clonedDoc.querySelectorAll('table');
            tables.forEach(table => {
              table.style.width = '100%';
              table.style.maxWidth = '100%';
            });
          }
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${this.chatTitle || '对话'}_${Date.now()}.png`;
        link.click();
      } catch (error) {
        console.error('导出图片失败:', error);
        throw new Error('导出图片失败：' + error.message);
      } finally {
        document.body.removeChild(container);
      }
    },

    toggleLocale(locale) {
      if (locale === i18n.global.locale.value) {
        return;
      }
      i18n.global.locale.value = locale
      localStorage.setItem('userLocale', locale)
      ElMessage.success(locale === 'zh' ? '已切换为简体中文' : '已切換為繁體中文')
    },
    handleScroll(event) {
      const {scrollTop, scrollHeight, clientHeight} = event.target;
      // 判断是否滚动到底部
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        this.loadMoreConversations();
      }
    },
    loadMoreConversations() {
      if (this.pageNo < this.totalPage) {
        this.fetchConversations(true);
      }
    },
    sessionCachesCleanUp() {
      // 定时清理缓存
      this.cacheCleanupTimer = setInterval(() => {
        this.checkAndCleanCache();
      }, 1000 * 60 * 5); // 每5分钟清理一次
    },
    // 检查并清理缓存
    checkAndCleanCache() {
      const cacheKeys = Object.keys(this.sessionCaches);
      const excessCount = cacheKeys.length - this.cacheConfig.maxConversations;

      if (excessCount <= 0) return;

      // 获取所有可清理的缓存并按访问时间排序
      const candidates = cacheKeys
          .filter(key => key !== this.activeConversationId)
          .map(key => ({key, accessTime: this.cacheAccessTimes[key] || 0}))
          .sort((a, b) => a.accessTime - b.accessTime)
          .slice(0, excessCount); // 只取需要清理的数量

      console.log('需要清理的缓存:', candidates);
      // 清理
      candidates.forEach(({key}) => {
        delete this.sessionCaches[key];
        delete this.cacheAccessTimes[key];
      });
    },
    openDescDialog(rowData) {
      const data = rowData.metadataDescribeBeans.find(item => item.describeType === 'DEFAULT')
      this.descForm = {
        describeType: data.describeType,
        describeContent: data.describeContent
      }
      this.descDialogVisible = true
    },
    // 关闭弹窗
    closeDescDialog() {
      this.descDialogVisible = false
      this.descForm = {describeType: '', describeContent: ''}
    },
    // 获取默认类型的注释内容
    getDefaultDescribeContent(describeBeans) {
      if (!describeBeans || !Array.isArray(describeBeans)) {
        return '';
      }
      const defaultDescribe = describeBeans.find(item => item.describeType && item.describeType === 'DEFAULT');
      return defaultDescribe ? defaultDescribe.describeContent : '';
    },

    // 处理下拉菜单命令
    handleDropdownCommand(command, commandData) {
      const sessionId = commandData.attrs.data;
      switch (command) {
        case 'rename':
          this.openRenameDialog(sessionId);
          break;
        case 'pin':
          this.pinConversation(sessionId);
          break;
        case 'unpin':
          this.unpinConversation(sessionId);
          break;
        case 'delete':
          this.deleteConversation(sessionId);
          break;
      }
    },
    // 处理下拉菜单显示/隐藏事件
    handleDropdownVisibleChange(chatId) {

    },
    stopGeneration() {
      // 取消当前会话的请求
      if (this.abortControllers[this.activeConversationId]) {
        this.abortControllers[this.activeConversationId].abort();
        delete this.abortControllers[this.activeConversationId];
      }
      // 清除当前对话的思考状态
      if (this.thinkingConversations[this.activeConversationId]) {
        delete this.thinkingConversations[this.activeConversationId]
      }
      this.scrollToBottom();
    },
    handleUserDropdownCommand(command) {
      if (command === 'logout') {
        this.logout();
      }
    },

    // 获取数据源列表
    async fetchDataSources() {
      try {
        const response = await post('/metadata/datasource/list');
        console.log('获取数据源列表成功:', response);
        if (response && response.code === 0) {
          this.dataSources = response.data || [];
          // 如果有数据源，默认选中第一个
          if (this.dataSources.length > 0 && !this.selectedDs) {
            this.selectedDs = this.dataSources[0].driverMetadataId;
            this.selectedDsName = this.dataSources[0].dsName;
            // 获取第一个数据源对应的模式列表
            await this.fetchSchemas(this.dataSources[0].dsName);
          }
        }
      } catch (error) {
        console.error('获取数据源列表失败:', error);
      }
    },
    // 获取模式列表
    async fetchSchemas(dsName) {
      try {
        const response = await post('/metadata/schema/list', {
          dsName: dsName
        });
        if (response && response.code === 0) {
          this.schemas = response.data || [];
          // 默认选中第一个模式
          if (this.schemas.length > 0 && !this.selectedSchema) {
            this.selectedSchema = this.schemas[0].schemaId;
            this.selectedSchemaName = this.schemas[0].schemaName;
          }
        }
      } catch (error) {
        console.error('获取模式列表失败:', error);
      }
    },
    // 数据源变化时的处理
    async handleDataSourceChange(value) {
      // 清空之前选择的模式
      this.selectedSchema = '';
      this.selectedSchemaName = '';
      this.schemas = [];
      const selected = this.dataSources.find(source => source.driverMetadataId === value);
      if (selected) {
        this.selectedDs = selected.driverMetadataId;
        this.selectedDsName = selected.dsName;
        await this.fetchSchemas(selected.dsName);
      }
    },
    // 模式变化时的处理
    handleSchemaChange(value) {
      const selected = this.schemas.find(source => source.schemaId === value);
      this.selectedSchema = selected.schemaId;
      this.selectedSchemaName = selected.schemaName;
    },
    // 获取对话列表
    async fetchConversations(loadMore = false) {
      if (this.loading) return; // 防止并发请求
      this.loading = true;
      try {
        if (loadMore) {
          this.pageNo++;
        }
        const response = await post('/mcp/chat/session/page', {
          pageNo: loadMore ? this.pageNo : 1,
          pageSize: this.pageSize,
        });
        if (response && response.code === 0) {
          const list = response.data.list || [];
          this.totalCount = parseInt(response.data.totalCount);
          this.totalPage = parseInt(response.data.totalPage);
          // 转换数据格式
          const formattedList = list.map(item => ({
            chatId: item.chatId,
            chatTitle: item.chatTitle,
            pinned: item.topFlag === 1,
            mcpChatSessionId: item.mcpChatSessionId  // 保留原始 ID 用于其他接口调用
          }));
          // 是否为加载更多
          if (loadMore) {
            this.conversations = [...this.conversations, ...formattedList];
          } else {
            this.pageNo = 1;
            this.conversations = formattedList;
          }
        } else {
          await this.createNewChat()
        }
      } catch (error) {
        console.error('获取对话列表失败:', error);
        ElMessage.error('获取对话列表失败:', error);
      } finally {
        this.loading = false;
      }
    },
    // 打开重命名弹窗
    openRenameDialog(mcpChatSessionId) {
      const conversation = this.conversations.find(c => c.mcpChatSessionId === mcpChatSessionId);
      if (conversation) {
        this.renameForm.title = (conversation.chatTitle).trim();
        this.renameTargetSessionId = mcpChatSessionId;
        this.renameDialogVisible = true;
      }
    },
    // 关闭弹窗
    closeRenameDialog() {
      this.renameDialogVisible = false;
      this.renameForm.title = '';
      this.renameTargetSessionId = null;
    },
    // 确认重命名
    async confirmRename() {
      const title = this.renameForm.title.trim();
      if (!title) {
        ElMessage.warning('标题不能为空');
        return;
      }
      if (title.length > 50) {
        ElMessage.warning('标题长度不能超过50个字符');
        return;
      }
      try {
        const response = await post('/mcp/chat/session/edit/title', {
          mcpChatSessionId: this.renameTargetSessionId,
          chatTitle: title
        });

        if (response && response.code === 0) {
          // 更新本地数据
          const conv = this.conversations.find(c => c.mcpChatSessionId === this.renameTargetSessionId);
          if (conv) {
            conv.chatTitle = title;
            if (this.activeConversationId === conv.chatId) {
              this.chatTitle = title;
            }
          }
          ElMessage.success('重命名成功');
          this.closeRenameDialog();
        } else {
          ElMessage.error('重命名失败: ' + (response?.message || '未知错误'));
        }
      } catch (error) {
        console.error('重命名失败:', error);
        ElMessage.error('重命名时发生错误');
      }
    },
    // 置顶对话
    async pinConversation(mcpChatSessionId) {
      try {
        const response = await post('/mcp/chat/session/top', {
          mcpChatSessionId: mcpChatSessionId
        });
        if (response && response.code === 0) {
          const index = this.conversations.findIndex(c => c.mcpChatSessionId === mcpChatSessionId);
          if (index > -1) {
            this.conversations[index].pinned = true;
            // 将置顶的对话移到数组开头
            const [pinnedConv] = this.conversations.splice(index, 1);
            this.conversations.unshift(pinnedConv);
          }
        } else {
          ElMessage.error('置顶对话失败: ' + response.message);
        }
      } catch (error) {
        console.error('置顶对话出错:', error);
        ElMessage.error('置顶对话时发生错误');
      }
    },
    // 取消置顶
    async unpinConversation(mcpChatSessionId) {
      try {
        const response = await post('/mcp/chat/session/cancel/top', {
          mcpChatSessionId: mcpChatSessionId
        });
        if (response && response.code === 0) {
          const conversation = this.conversations.find(c => c.mcpChatSessionId === mcpChatSessionId);
          if (conversation) {
            conversation.pinned = false;
          }
        } else {
          ElMessage.error('取消置顶失败: ' + response.data.message);
        }
      } catch (error) {
        console.error('取消置顶对话出错:', error);
        ElMessage.error('取消置顶对话时发生错误');
      }
    },
    // 消息发送
    async sendMessage() {
      // 如果正在输入法输入，不发送消息
      if (this.isComposing) {
        return;
      }
      if (!this.selectedDsName) {
        ElMessage.warning(i18n.global.t('home.selectDataSource'));
        return;
      }
      if (!this.selectedSchema) {
        ElMessage.warning(i18n.global.t('home.selectSchema'));
        return;
      }
      const text = this.userInput.trim()
      if (!text) return

      // 保存当前会话ID
      let currentSessionId = this.activeConversationId
      let conversation = this.conversations.find(c => c.chatId === currentSessionId)
      if (!conversation) {
        currentSessionId = uuidv4()
        conversation = {
          chatId: null,
          chatTitle: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          pinned: false,
        }
        this.activeConversationId = currentSessionId
        this.sessionCaches[currentSessionId] = []
      }
      //缓存用户提问
      const userMessageIndex = this.sessionCaches[currentSessionId].length;
      this.sessionCaches[currentSessionId].push({
        type: 'user',
        content: text,
      })
      this.userInput = ''
      this.adjustHeight(62)
      this.scrollToBottom()

      // 设置当前对话为思考状态
      this.thinkingConversations[currentSessionId] = true

      // 取消当前会话的旧请求（不取消其他会话的）
      if (this.abortControllers[currentSessionId]) {
        this.abortControllers[currentSessionId].abort();
        delete this.abortControllers[currentSessionId];
      }

      // 创建新控制器并保存
      const abortController = new AbortController();
      this.abortControllers[currentSessionId] = abortController;
      // 创建超时定时器
      let cancelReason = null; // 记录取消原因
      const timeoutId = setTimeout(() => {
        cancelReason = 'timeout';
        abortController.abort();
      }, 180000); // 5 分钟超时
      try {
        const response = await sendMessagePost('/chat', {
          question: text,
          dsName: this.selectedDsName,
          schemaId: this.selectedSchema,
          schemaName: this.selectedSchemaName,
          chatId: conversation.chatId || null
        }, {
          signal: abortController.signal
        })

        if (response && response.code === 0) {
          if (this.sessionCaches[currentSessionId]) {
            // 缓存AI回答
            this.sessionCaches[currentSessionId].push({
              type: 'ai',
              content: response.data.answer,
            })

            // 更新刚才发送的用户消息，添加 chatRecordId（使用记录的索引）
            if (this.sessionCaches[currentSessionId][userMessageIndex]) {
              this.sessionCaches[currentSessionId][userMessageIndex].chatRecordId = response.data.mcpChatRecordId
            }
          }
          //如果是新会话
          if (!conversation.chatId && response.data.chatId) {
            conversation.chatId = response.data.chatId
            this.activeConversationId = response.data.chatId
            // 将临时缓存的会话数据关联到真实Id会话
            this.sessionCaches[response.data.chatId] = this.sessionCaches[currentSessionId]
            this.cacheAccessTimes[response.data.chatId] = Date.now()
            //删除临时会话缓存
            delete this.sessionCaches[currentSessionId]

            await this.fetchConversations()
          }
        } else {
          throw new Error(response?.message || '请求失败')
        }
      } catch (error) {
        console.error('发送消息出错:', error);
        if (error.name === 'AbortError') {
          if (cancelReason === 'timeout') {
            if (this.sessionCaches[currentSessionId]) {
              // 缓存当前错误信息
              this.sessionCaches[currentSessionId].push({
                type: 'ai',
                content: '抱歉，消息发送超时，请稍后重试。',
              })
            }
          } else {
            console.log('请求已被用户取消');
          }
        } else {
          if (this.sessionCaches[currentSessionId]) {
            // 缓存当前错误信息
            this.sessionCaches[currentSessionId].push({
              type: 'ai',
              content: '抱歉，消息发送失败，请稍后重试。',
            })
          }
        }
      } finally {
        clearTimeout(timeoutId); // 请求成功，清除定时器
        // 只清除当前控制器的思考状态
        if (this.abortControllers && abortController === this.abortControllers[currentSessionId]) {
          delete this.abortControllers[currentSessionId];
          // 只清除当前请求对应的思考状态
          if (this.thinkingConversations[currentSessionId]) {
            delete this.thinkingConversations[currentSessionId]
          }
        }
        this.scrollToBottom()
      }
    },
    // 创建新对话
    async createNewChat() {
      if (!this.activeConversationId) {
        this.$nextTick(() => {
          ElMessage({
            message: '已是最新对话',
            type: 'success',
            duration: 2000,
            customClass: 'el-message--latest-dialog',
          });
        });
        return;
      }
      //初始化数据源及schema
      this.selectedDs = this.dataSources[0].driverMetadataId;
      this.selectedDsName = this.dataSources[0].dsName;
      await this.fetchSchemas(this.dataSources[0].dsName);
      this.selectedSchema = this.schemas[0].schemaId;
      this.selectedSchemaName = this.schemas[0].schemaName;
      // 清空当前状态，但不创建空对话
      this.activeConversationId = null;
      this.chatTitle = '';
      this.$nextTick(() => {
        if (this.$refs.messageInput) {
          this.$refs.messageInput.focus();
        }
      });
    },
    // 选择对话
    async selectConversation(chatId) {
      this.activeConversationId = chatId;
      // 获取当前对话
      const conversation = this.conversations.find(c => c.chatId === chatId)
      if (conversation) {
        this.chatTitle = conversation.chatTitle;
        this.userInput = '';
        // 检查缓存,如果没有则从接口获取
        if (!this.sessionCaches[this.activeConversationId]) {
          await this.fetchConversationDetail(conversation.chatId);
        }
      }
      this.cacheAccessTimes[chatId] = Date.now(); // 更新访问时间
      this.scrollToBottom();
    },
    // 获取对话详情
    async fetchConversationDetail(conversationId) {
      try {
        const response = await post('/mcp/chat/record/list', {
          chatId: conversationId
        });
        if (response && response.code === 0) {
          const records = response.data || [];
          // 每条记录包含 question 和 answer，需要转换为两条消息
          const messages = [];
          records.forEach(record => {
            // 用户问题消息
            messages.push({
              chatRecordId: record.mcpChatRecordId,
              type: 'user',
              content: record.question,
            });

            // AI回答消息
            messages.push({
              type: 'ai',
              content: record.answer,
            });
          });
          // 缓存会话数据
          this.sessionCaches[conversationId] = messages;
        }
      } catch (error) {
        console.error('获取对话详情出错:', error);
      }
    },
    // 删除对话
    async deleteConversation(mcpChatSessionId) {
      try {
        await this.$confirm('确定要删除这个对话吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        try {
          const response = await post('/mcp/chat/session/delete', {
            mcpChatSessionId: mcpChatSessionId
          });
          if (response && response.code === 0) {
            // 找到要删除的对话
            const index = this.conversations.findIndex(c => c.mcpChatSessionId === mcpChatSessionId);
            if (index !== -1) {
              // 保存当前高亮的对话ID
              const currentlyActiveId = this.activeConversationId;
              // 获取要删除的对话的chatId
              const deletingChatId = this.conversations[index].chatId;
              // 从列表中删除对话
              this.conversations.splice(index, 1);

              // 只有当删除的是当前高亮的对话时，才需要重新设置高亮
              if (currentlyActiveId === deletingChatId && this.conversations.length > 0) {
                // 设置新的高亮对话为第一个
                // this.activeConversationId = this.conversations[0].chatId;
                // // 加载新高亮对话的详情
                // await this.fetchConversationDetail(this.activeConversationId);
                await this.createNewChat();
              } else if (currentlyActiveId === deletingChatId && this.conversations.length === 0) {
                // 如果删除后没有对话了，创建新对话
                await this.createNewChat();
              }
              // 如果删除的不是当前高亮对话，则保持当前高亮状态不变
            }
          } else {
            ElMessage.error('删除失败: ' + response.data.message);
          }
        } catch (error) {
          console.error('删除对话出错:', error);
          ElMessage.error('删除对话时发生错误');
        }
      } catch {
        // 用户取消删除操作
        console.log('用户取消删除');
      }
    },

    logout() {
      // 清除本地存储的用户相关信息
      removeToken()
      // 跳转到登录页面
      this.$router.push('/login');
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    adjustHeight(height) {
      const textarea = this.$refs.messageInput
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, height) + 'px'
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    async openSearch() {
      this.searchDialogVisible = true;
      await this.searchChat();
    },
    async searchChat() {
      const response = await post('/chat/chatLists', {
        userId: localStorage.getItem('userId'),
        search: this.search,
      });
      if (response && response.code === 0) {
        this.searchChats = response.data || [];
      }
    },
    // 处理搜索输入（带防抖）
    handleSearchInput() {
      // 清除之前的定时器
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      // 设置 500ms 防抖延迟
      this.searchDebounceTimer = setTimeout(async () => {
        await this.searchChat();
      }, 500);
    },
    // 选择对话
    selectChat(chat) {
      this.searchDialogVisible = false;
      this.selectConversation(chat.chatId);
    },
    newChat() {
      this.closeSearchDialog();
      this.createNewChat();
    },
    closeSearchDialog() {
      this.searchDialogVisible = false;
      this.search = '';
      this.searchChats = [];
      this.searchDebounceTimer = null;
    }
  },

}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: white;
}

/* 左侧边栏 */
.sidebar {
  width: 240px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e9ecef;
  flex-shrink: 0;
  transition: margin-left 0.3s ease;
}

.sidebar.collapsed {
  margin-left: -240px;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0 12px;
}

.logo {
  padding: 16px 0 4px 4px;
  display: flex;
  align-items: center;
}

.vac-logo {
  max-width: 80%;
  max-height: 80%;
  cursor: pointer;
}

.new-chat-btn {
  margin: 10px 0;
  padding: 18px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #333;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.new-chat-btn:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.search-chat ::v-deep(.el-input__wrapper) {
  border-radius: 30px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.05);
}

.search-chat ::v-deep(.el-input__inner) {
  cursor: pointer;
}

::v-deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #e4e7ed inset !important;
}

.conversation-section {
  flex: 1;
  overflow-y: auto;
  height: 100%;
  padding-right: 8px;
  margin-right: -12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0 12px;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 8px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  height: 36px;
  width: 100%;
}

.conversation-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.conversation-item.active {
  background: #e4edfd;
}

.conversation-item:hover .menu-btn {
  opacity: 1;
}

.conversation-item:hover .conversation-content {
  width: 88%;
}

.conversation-content {
  width: 100%;
}

.conversation-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  /*text-overflow: ellipsis;*/
  margin-bottom: 2px;
}

.user-section {
  padding: 8px 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
}

.user-info:hover {
  background: rgba(0, 0, 0, 0.05);
}

.user-avatar {
  font-size: 24px;
}

.user-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.main-content {
  display: flex;
  flex-direction: column;
  background: white;
  position: relative;
}

.chat-actions {
  position: absolute;
  top: 20px;
  right: 60px;
  color: black;
  font-size: 20px;
  cursor: pointer;
}

.chat-header {
  padding: 10px 100px;
  background: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

.chat-title {
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* 消息区域*/
.chat-messages {
  flex: 1;
  overflow-y: auto;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  scrollbar-width: none;
}

/* 欢迎消息 */
.welcome-message {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  padding: 26% 20px 0;
}

.welcome-message h1 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.welcome-message p {
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
}

/* 消息列表*/
.message-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.message-wrapper {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 消息通用样式 */
.message {
  display: flex;
  gap: 16px;
  padding: 8px 0;
}

.user-message {
  max-width: 90%;
}

.ai-message {
  width: 100%;
}

.message-text {
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 16px;
  color: #333;
  /*white-space: pre-wrap;*/
  word-break: break-word;
}

.message.user {
  justify-content: flex-end;
}

.message.user .message-text {
  background: #e4edfd;
}

/* 思考动画 */
.thinking {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #f0f9ff;
  border-radius: 12px;
}

.sendThinking {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f0f9ff;
  border-radius: 12px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #67c23a;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.thinking-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* 输入区域 */
.input-area {
  padding: 16px 0px 10px;
  width: 100%;
  margin: 0 auto;
}

.textarea-wrapper {
  max-width: 800px; /* 限制最大宽度 */
  padding: 12px 20px; /* 左右内边距，避免文字贴边 */
  border: 1px solid #e9ecef;
  border-radius: 24px;
  background: white;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  margin: 0 auto; /* 居中容器 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

textarea {
  width: 100%;
  border: none;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  min-height: 62px;
  max-height: 200px;
  scrollbar-width: none;
  text-align: left; /* 关键：左对齐 */
  padding-left: 0; /* 可选：更贴近左侧 */
  padding-right: 0; /* 可选：右侧也清空 */
  background: transparent; /* 避免覆盖父级背景 */
}

textarea:disabled {
  background-color: white;
  opacity: 0.6;
  cursor: not-allowed;
}

textarea::placeholder {
  opacity: 0.5; /* 或者使用 color: rgba(0, 0, 0, 0.5); */
}

.send-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.send-btn:hover:not(:disabled) {
  background: #2563eb;
}

.send-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.send-btn.thinking {
  background: #94a3b8;
}

.input-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.footer-text {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  font-size: 16px;
  margin-left: auto;
  opacity: 0.7;
}

.toggle-sidebar-btn:hover {
  opacity: 1;
  color: #3b82f6;
}

.sidebar.collapsed .user-section {
  overflow: hidden;
}

.message.ai {
  justify-content: flex-start;
}

.menu-dropdown {
  position: absolute;
  margin-left: auto;
  right: 4px;
}

.menu-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 18px;
  opacity: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-btn:hover {
  color: #333;
  background: rgba(0, 0, 0, 0.05);
}

.textarea-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-group {
  display: flex;
  width: 40%;
}

.control-select {
  margin-right: 10px;
}

.control-option {
  padding: 0 10px;
}

.control-option-content {
  display: flex;
  align-items: center;
}

.el-dropdown-link {
  cursor: pointer;
}

.logout-btn {
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.expand-btn-wrapper {
  margin-top: 16px;
  margin-left: 50px;
  cursor: pointer;
  color: #666;
}

.meta-data-desc {
  padding: 0px 8px;
  font-size: 12px;
  margin-left: 12px;
  color: rgb(64, 158, 255);
  cursor: pointer;
  border: 1px solid rgb(64, 158, 255);
  border-radius: 4px;
  display: flex;
  align-items: center;
  height: 24px;
}

.meta-data-desc-content {
  max-width: 50px;
  overflow: hidden;
  white-space: nowrap;
}

::v-deep(.el-select__wrapper) {
  border-radius: 24px;
}

/*去除滚动条*/
::v-deep(.el-textarea__inner) {
  -ms-overflow-style: none; /* IE和Edge */
  scrollbar-width: none; /* Firefox */
}

.search-input ::v-deep(.el-input__wrapper) {
  background: rgba(0, 0, 0, 0.05);
  height: 38px;
  border-radius: 8px;
}

.search-container {
  display: flex;
  flex-direction: column;
  padding: 8px 12px 14px;
}

.new-chat {
  font-weight: bold;
  cursor: pointer;
  margin-top: 8px;
  padding: 8px;
}

.new-chat:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.search-content {
  height: 300px;
  overflow-y: auto;
}

.search-header {
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
  padding: 8px;
  font-weight: bold;
  color: #b2b1b1;
}

.search-title {
  width: 99%;
  padding: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  cursor: pointer;
}

.search-title:hover {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.message-selection {
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
}

.message-select-item {
  padding: 2px 0;
}

.export-section {
  margin-top: 10px;
}

::v-deep(.el-table-v2__header) {
  background-color: #F4F5F7;
}

::v-deep(.el-table-v2__header-cell) {
  background-color: transparent !important;
  color: #333333;
  font-size: 14px;
  font-family: PingFangSC-Medium;
  font-weight: 500;
  /*justify-content: center;*/
}

/* 响应式 */
@media (max-width: 1200px) {
  .chat-messages, .chat-header, .input-area {
    max-width: 600px;
  }
}
::-webkit-scrollbar {
  width: 7px;
}
::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: #e8e8e8;
}
::-webkit-scrollbar-track {
  background: transparent;
}
</style>
