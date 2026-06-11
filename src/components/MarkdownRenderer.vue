<template>
  <div class="markdown-renderer" v-html="renderedContent"></div>
</template>

<script>
import MarkdownFactory from '@/utils/markdownFactory'
import DOMPurify from 'dompurify'

export default {
  name: 'MarkdownRenderer',
  props: {
    content: {
      type: String,
      required: true,
      default: ''
    },
  },
  data() {
    return {
    }
  },
  computed: {
    renderedContent() {
      if (!this.content) return ''
      return this.renderMarkdown(this.content)
    }
  },
  methods: {
    renderMarkdown(content) {
      // console.log('renderMarkdown:', content)
      // const test =
      //     "### **1. 集合的特点**\n" +
      //     "- **无序性**：集合中的元素没有固定的顺序，无法通过索引访问。\n" +
      //     "- **唯一性**：集合中的元素必须是唯一的，重复的元素会被自动去重。\n" +
      //     "- **可变性**：集合本身是可变的，可以添加或删除元素，但集合中的元素必须是不可变类型（如整数、字符串、元组等）。\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **2. 创建集合**\n" +
      //     "可以通过以下方式创建集合：\n" +
      //     "\n" +
      //     "#### 使用花括号 `{}`\n" +
      //     "```python\n" +
      //     "my_set = {1, 2, 3, 4}\n" +
      //     "```\n" +
      //     "\n" +
      //     "#### 使用 `set()` 函数\n" +
      //     "```python\n" +
      //     "my_set = set([1, 2, 3, 4])  # 从列表转换\n" +
      //     "my_set = set(\"hello\")       # 从字符串转换，结果为 {'h', 'e', 'l', 'o'}\n" +
      //     "```\n" +
      //     "\n" +
      //     "**注意**：空集合必须用 `set()` 创建，`{}` 表示空字典。\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **3. 集合的常用操作**\n" +
      //     "\n" +
      //     "#### **添加元素**\n" +
      //     "- `add()`：添加单个元素。\n" +
      //     "  ```python\n" +
      //     "  my_set.add(5)  # {1, 2, 3, 4, 5}\n" +
      //     "  ```\n" +
      //     "- `update()`：添加多个元素（可以是列表、元组或其他集合）。\n" +
      //     "  ```python\n" +
      //     "  my_set.update([5, 6, 7])  # {1, 2, 3, 4, 5, 6, 7}\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "#### **删除元素**\n" +
      //     "- `remove()`：删除指定元素，如果元素不存在会报错。\n" +
      //     "  ```python\n" +
      //     "  my_set.remove(3)  # {1, 2, 4, 5, 6, 7}\n" +
      //     "  ```\n" +
      //     "- `discard()`：删除指定元素，如果元素不存在不会报错。\n" +
      //     "  ```python\n" +
      //     "  my_set.discard(10)  # 无变化\n" +
      //     "  ```\n" +
      //     "- `pop()`：随机删除并返回一个元素（因为集合无序）。\n" +
      //     "  ```python\n" +
      //     "  item = my_set.pop()\n" +
      //     "  ```\n" +
      //     "- `clear()`：清空集合。\n" +
      //     "  ```python\n" +
      //     "  my_set.clear()  # set()\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **4. 集合的运算**\n" +
      //     "集合支持数学中的集合运算，如并集、交集、差集等。\n" +
      //     "\n" +
      //     "#### **并集（Union）**\n" +
      //     "- `union()` 或 `|` 运算符。\n" +
      //     "  ```python\n" +
      //     "  set1 = {1, 2, 3}\n" +
      //     "  set2 = {3, 4, 5}\n" +
      //     "  print(set1.union(set2))  # {1, 2, 3, 4, 5}\n" +
      //     "  print(set1 | set2)       # 同上\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "#### **交集（Intersection）**\n" +
      //     "- `intersection()` 或 `&` 运算符。\n" +
      //     "  ```python\n" +
      //     "  print(set1.intersection(set2))  # {3}\n" +
      //     "  print(set1 & set2)              # 同上\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "#### **差集（Difference）**\n" +
      //     "- `difference()` 或 `-` 运算符。\n" +
      //     "  ```python\n" +
      //     "  print(set1.difference(set2))  # {1, 2}（set1 有但 set2 没有的元素）\n" +
      //     "  print(set1 - set2)            # 同上\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "#### **对称差集（Symmetric Difference）**\n" +
      //     "- `symmetric_difference()` 或 `^` 运算符。\n" +
      //     "  ```python\n" +
      //     "  print(set1.symmetric_difference(set2))  # {1, 2, 4, 5}（仅在其中一个集合中出现的元素）\n" +
      //     "  print(set1 ^ set2)                      # 同上\n" +
      //     "  ```\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **5. 集合的其他方法**\n" +
      //     "- `issubset()`：判断是否为子集。\n" +
      //     "- `issuperset()`：判断是否为超集。\n" +
      //     "- `isdisjoint()`：判断是否没有交集。\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **6. 应用场景**\n" +
      //     "- **去重**：快速去除列表中的重复元素。\n" +
      //     "  ```python\n" +
      //     "  my_list = [1, 2, 2, 3, 4, 4]\n" +
      //     "  unique_list = list(set(my_list))  # [1, 2, 3, 4]\n" +
      //     "  ```\n" +
      //     "- **成员测试**：检查元素是否在集合中（效率高于列表）。\n" +
      //     "  ```python\n" +
      //     "  if 3 in my_set:\n" +
      //     "      print(\"存在\")\n" +
      //     "  ```\n" +
      //     "- **数学运算**：如交集、并集等。\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "### **7. 不可变集合（Frozen Set）**\n" +
      //     "如果需要不可变的集合，可以使用 `frozenset`：\n" +
      //     "```python\n" +
      //     "frozen_set = frozenset([1, 2, 3])\n" +
      //     "```\n" +
      //     "\n" +
      //     "---\n" +
      //     "\n" +
      //     "如果你有具体的集合操作问题或需要进一步讲解，请告诉我！\n"
      const md = MarkdownFactory.getInstance() // 获取单例实例
      if (!md || !content) return content

      let rendered = md.render(content)

      // 为表格添加滚动容器
      rendered = rendered.replace(/<table>/g, '<div class="table-container"><table>')
          .replace(/<\/table>/g, '</table></div>')

      // 为表格单元格添加title属性
      rendered = rendered.replace(/<th>(.*?)<\/th>/g, '<th title="$1">$1</th>')
          .replace(/<td>(.*?)<\/td>/g, '<td title="$1">$1</td>')

      // 安全过滤，防止XSS攻击
      return DOMPurify.sanitize(rendered)
    }
  }
}
</script>

<style scoped>
/* 修改这部分，11121212121222代码块样式*/
.markdown-renderer :deep(.hljs) {
  background: #f6f8fa;
  padding: 0.5em;
  border-radius: 6px;
  overflow-x: auto;
}

/* 修改，为表格添加一个滚动容器 */
.markdown-renderer :deep(.table-container) {
  overflow-x: auto;
  width: 100%;
}

.markdown-renderer :deep(table) {
  width: 100%;
  min-width: 600px; /* 设置最小宽度，可根据需要调整 */
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 12px;
  border: 1px solid #ddd;
  table-layout: auto; /* 允许列宽自适应内容 */
}

.markdown-renderer :deep(table::-webkit-scrollbar) {
  display: none;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 6px;
  text-align: left;
  white-space: nowrap; /* 防止单元格内换行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 超出内容显示省略号 */
  max-width: 100px; /* 限制最大宽度 */
}

.markdown-renderer :deep(tr:nth-child(2n)) {
  background-color: #f6f8fa;
}
.markdown-renderer :deep(tr:hover) {
  background-color: #f5f5f5;
}
</style>
