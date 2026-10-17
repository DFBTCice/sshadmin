# SSHAdmin 使用手册

适用：macOS 版 SSHAdmin 0.1.0，CLI 协议版本 1。核对日期：2026-10-17。

这是一份日常操作手册。先看“快速开始”，遇到具体问题再查对应章节。命令以当前已安装程序的 `--help` 和项目实现为准；后续升级时可用 `sshadmin --help` 检查变化。

文中的 `dev-server` 是示例主机别名，`work` 是示例 tmux 会话名，请替换成自己的名称。`<别名>`、`<秒数>` 是占位符，实际输入时不要保留尖括号。

## 目录

1. [快速开始：最常用的操作](#quickstart)
2. [先分清几个概念](#concepts)
3. [主机管理：识别、新增、编辑、删除](#hosts)
4. [密码、私钥与凭据管理](#credentials)
5. [终端：标签、分屏、快捷键与历史](#terminal)
6. [tmux：关闭软件后继续运行与重新接入](#tmux)
7. [全部 SSHAdmin 自定义命令](#cli)
8. [让本机 AI 使用服务器](#ai)
9. [常用操作示例](#recipes)
10. [设置、备份与数据位置](#settings)
11. [常见问题与错误处理](#troubleshooting)
12. [更新、迁移、卸载与功能边界](#maintenance)
13. [核验范围与进一步阅读](#references)

<a id="quickstart"></a>
## 1. 快速开始：最常用的操作

### 1.1 用别名直接连接服务器

在 macOS“终端”、其他终端软件或本机 AI 的终端里输入：

```bash
sshadmin ssh dev-server
```

登录后输入的命令在服务器上执行。输入 `exit` 退出这次 SSH 登录。

只查询主机名和用户名，查询完自动返回本机：

```bash
sshadmin ssh dev-server 'hostname; id -un'
```

命令执行完会自动回到本机，并带回远端命令的退出码（成功为 `0`）。

### 1.2 找到现有主机

打开 SSHAdmin → **主机**。软件自动读取 `~/.ssh/config` 及其中的 `Include` 文件。也可执行：

```bash
sshadmin list
```

### 1.3 新增一台密码登录的主机

1. **主机 → 新增**，填写别名、地址、用户和端口。
2. 认证方式选 **密码（保存到钥匙串）**，填写密码；也可以先保存主机，再在详情中保存密码。
3. 点 **预览变更**，确认写入内容后应用。
4. 完成 **测试并信任**，核对服务器指纹；如 macOS 提示钥匙串授权，按自己的使用意愿授权。
5. 确认主机详情中允许 AI 使用已保存凭据，并通过新连接验证。
6. 之后输入 `sshadmin ssh 别名` 即可，无需反复输入密码。

### 1.4 让任务在关闭软件后继续运行

**tmux → 选主机 → 启用 → 输入会话名 → 新建并接入**，然后在接入的终端里启动任务。

离开时关闭该终端标签，或按 `Ctrl+B`、松开后按 `D` 分离。下次打开软件，到 **tmux → 同一主机 → 原会话 → 接入**。

不要点击 **结束** 来代替离开；它会结束远端会话。远端服务器、tmux 和任务本身需要继续运行。

### 1.5 命令速查

| 你想做什么 | 输入什么 |
| --- | --- |
| 看所有主机 | `sshadmin list` |
| 看主机详情 | `sshadmin show dev-server` |
| 登录服务器 | `sshadmin ssh dev-server` |
| 执行一条命令 | `sshadmin ssh dev-server 'df -h'` |
| 检查连接是否可用 | `sshadmin doctor dev-server --connect` |
| 给 AI 返回 JSON | `sshadmin exec dev-server -c 'hostname' --json` |
| 接入已经存在的 tmux 会话 | `sshadmin connect dev-server --tmux work` |
| 查用法 | `sshadmin --help`、`sshadmin ssh --help` |

<a id="concepts"></a>
## 2. 先分清几个概念

### 2.1 六个页面分别做什么

| 页面 | 主要用途 |
| --- | --- |
| 主机 | 识别和管理连接，分组、标签、备注，测试认证，打开终端 |
| 终端 | 本地 Shell、远程 SSH、标签与分屏、搜索输出 |
| tmux | 检测远端 tmux，创建、接入、重命名和结束会话 |
| 凭据 | 查看已保存凭据的索引、关联主机，删除不再需要的凭据 |
| AI 接入 | 查看可供 AI 使用的主机，复制接入说明，安装命令链接 |
| 设置 | 外观、字体、历史、配置备份恢复、诊断和版本信息 |

### 2.2 原生 SSH 与 SSHAdmin 命令的区别

| 入口 | 适合做什么 | 是否使用 SSHAdmin 保存的密码 |
| --- | --- | --- |
| `ssh dev-server` | 直接用系统 SSH | 不会自动读取 SSHAdmin 钥匙串凭据 |
| `sshadmin ssh dev-server` | 日常登录、AI 自己的终端、管道、转发、长任务 | 条件满足时会代为提交 |
| `sshadmin exec dev-server -c '命令' --json` | AI/脚本需要结构化执行结果 | 条件满足时会代为提交 |
| `sshadmin connect dev-server` | 人在交互终端登录，或用 `--tmux` 接入会话 | 条件满足时会使用，支持交互处理 |
| SSHAdmin 的“打开终端” | 在软件界面内操作服务器 | 条件满足时会使用 |

`sshadmin ssh` 在调用方自己的终端工作，GUI 不需要开着。它最终调用系统 `/usr/bin/ssh`，SSHAdmin 负责配置和凭据配合。

“无需输入密码”不等于服务器改成了公钥免密登录：密码认证仍然存在，只是软件通过受控通道代为提交。它不会自动给服务器安装公钥或修改 SSH 服务。

### 2.3 别名、显示名称、地址

- **别名（Host）**：命令里使用的名字，例如 `dev-server`；精确匹配，区分大小写。
- **显示名称**：界面上好认的名称，例如“开发服务器”；不替代命令中的别名。
- **地址（HostName）**：真实 IP 或域名，例如 `10.0.1.21` 或 `dev.example.com`。

不要只看显示名称或地址来猜命令参数，别名以 `sshadmin list` 的输出为准。

<a id="hosts"></a>
## 3. 主机管理：识别、新增、编辑、删除

### 3.1 现有配置如何识别

首次启动读取 `~/.ssh/config` 和 `Include` 引用的文件，识别里面的具体 `Host` 别名。首次识别不会主动连接主机，也不会改写原配置。

以下配置会识别为别名 `dev-server`：

```sshconfig
Host dev-server
    HostName 10.0.1.21
    User deploy
    Port 22
```

这只是格式示例。已经写在 `~/.ssh/config` 里的主机无需重新添加。

- 仅在历史命令中用过 `ssh 用户@IP`，不代表已经有可识别的 `Host` 配置。
- `known_hosts` 记录服务器公钥，不能代替完整主机配置。
- 只放了一个私钥文件，软件无法据此推断它对应哪台服务器。
- `Host *` 等通配规则用于继承配置，不会凭空展开成所有服务器。
- 存在 `Match` 等动态规则时，界面展示的是可静态确定的信息；真正连接时由 OpenSSH 解析最终配置。

从外部修改 SSH 配置后，程序会监听并刷新。若列表没有更新，可重新进入页面或重启软件，再查看“配置中有 … 个提示”。

### 3.2 新增主机的字段

| 字段 | 怎么填写 |
| --- | --- |
| 别名 | 建议使用易记的英文、数字、连字符，例如 `dev-server` |
| 显示名称 | 可选，便于辨认；命令仍用别名 |
| 主机名 / 地址 | IP 或域名 |
| 用户 | 服务器登录账号；留空可能使用继承值或本机用户名，通常应明确填写 |
| 端口 | 通常为 22；有继承配置时以最终生效值为准 |
| 认证方式 | 沿用现有配置 / 密码 / 私钥文件 / SSH Agent |
| 私钥文件路径 | 选择本机已有的私钥；多把密钥可每行一个路径；不是 `.pub` 公钥文件 |
| IdentityAgent | 选择 SSH Agent 时可填写自定义代理套接字，普通使用通常不必填 |
| 跳板机 | `ProxyJump`，例如已有别名 `bastion` |
| 分组、标签、备注 | 用于整理；标签用逗号分隔 |
| 启用 tmux 管理 | 允许该主机使用 tmux 管理功能，不会给服务器安装 tmux |

新增的托管配置写入 `~/.ssh/sshadmin.conf`；首次需要时，软件会在主配置中加入 `Include`。写入前展示差异并自动备份。

### 3.3 编辑与重命名

选择主机 → **编辑 → 预览变更 → 应用**。来自已有配置的主机会在原文件位置做必要修改。

如果一个配置块同时服务多个别名，界面会提示共享关系。只想修改当前别名时，勾选 **只修改当前别名**，避免影响共享别名。

改命令中的名字要用 **重命名**；改界面显示名称用 **编辑**。改过别名后，同步更新自己和 AI 使用的命令。

若出现“配置已被外部修改”，重新读取后再生成预览，不要直接覆盖。地址、用户、端口、跳板或凭据发生变化后，通常需要重新 **测试并信任**。

### 3.4 删除主机

选择主机 → **删除** → 检查差异 → 确认。

这是删除本地连接配置，不会删除远端服务器或服务器文件。是否同时删除钥匙串凭据，由删除弹窗中的选项决定；仍被其他主机引用的凭据会保留。

### 3.5 搜索与整理

主机页支持按别名、地址、用户、标签等搜索，并通过分组、标签和“最近使用”筛选。选中主机查看详情；双击主机可打开 SSH 终端。

<a id="credentials"></a>
## 4. 密码、私钥与凭据管理

### 4.1 密码登录

主机详情 → **保存密码…** → 类型选“登录密码” → **保存到钥匙串** → **测试并信任**。

保存后不回显密码。服务器密码变更后，在同一位置点 **更新**，再验证连接。SSHAdmin 保存密码不会更改服务器上的账户密码。

### 4.2 私钥登录

主机 → **编辑** → 认证方式选“私钥文件” → 选择私钥路径 → 预览并应用 → 测试连接。

软件只引用私钥路径，不把私钥复制进数据库。移动或删除该文件会影响连接。

如果私钥本身带口令：主机详情 → **保存密码…** → 类型选 **私钥口令** → 指定对应私钥路径 → 保存并验证。私钥口令用于解锁私钥，与服务器登录密码是两回事。

### 4.3 SSH Agent

认证方式选 **SSH Agent**，由你已有的 agent 提供密钥。需要保证运行 SSHAdmin/AI 的进程能访问这个 agent。

可在对应终端执行 `ssh-add -l` 查看 agent 中的密钥指纹。这是系统命令，不是 SSHAdmin 自定义命令。agent 不可用、没有加载密钥或需要硬件确认时，仍需要你处理。

### 4.4 “测试并信任”与“AI 可用”

“测试并信任”会验证真实连接，并在需要时请你确认服务器指纹。请通过已有可信信息或管理员核对指纹。

“AI 可用”表示有过一次新连接、无需人工输入、严格主机校验成功的验证。它不是持续在线监控；网络、服务器或凭据后来变化时仍可能失败。

### 4.5 凭据页的三个概念

| 操作 | 实际效果 |
| --- | --- |
| 更新凭据 | 替换保存的密码或私钥口令，需要重新验证 |
| 解除关联 | 主机不再使用这条凭据，但钥匙串项仍保留 |
| 删除凭据 | 真正删除钥匙串项；仍有主机引用时拒绝删除 |

在 **凭据** 页可看类型、关联主机、钥匙串条目状态、更新时间。不能查看或导出密码明文。删除前先在相应主机详情中解除关联。

外部删除或改名配置后，可能出现“失去对应配置的记录”；这些记录会保留，对应 Host 回来后可恢复关联。

### 4.6 AI 使用开关与跳板机

主机详情的 **AI 可使用已保存凭据** 可控制 SSHAdmin 的 AI 命令是否使用该凭据。关闭它不会撤销密钥，也不会禁止其他程序直接运行系统 `ssh`。

跳板机和目标主机是两次不同的认证。目标主机保存了密码，不代表跳板机密码也能自动填写；目标密码不会拿来回答跳板机的挑战。遇到跳板机口令、验证码或硬件确认，应先完成相应认证准备，或使用交互终端。

<a id="terminal"></a>
## 5. 终端：标签、分屏、快捷键与历史

### 5.1 打开、分屏与切换主机

- **主机 → 打开终端**：新建该主机的 SSH 终端。
- 终端标签栏 **+**：新建本地终端。
- **+** 旁的 **▾**：选择本地终端或一台主机。
- 面板右上角的分屏按钮：左右或上下分屏。
- **每个面板的标题也是下拉菜单**：可单独切换为本地或另一台主机。

切换面板连接目标会关闭这个面板的旧连接并建立新连接；如果已输入过内容，界面会先确认。其他面板不受影响。

不要把界面上的“本地终端”当成服务器终端。执行操作前看面板标题，必要时运行 `hostname`、`id -un` 确认位置。

### 5.2 常用快捷键

以下快捷键用于 SSHAdmin 的终端页。`⌘` 是 Command，`⇧` 是 Shift。

| 快捷键 | 作用 |
| --- | --- |
| `⌘T` | 新建本地终端标签 |
| `⌘D` | 左右分屏 |
| `⇧⌘D` | 上下分屏 |
| `⌘W` | 关闭当前面板；只有一个面板时关闭该标签 |
| `⇧⌘W` | 关闭整个窗口（`⌘W` 留给终端面板） |
| `⌘1` … `⌘9` | 切换对应标签 |
| `⌘[` / `⌘]` | 在当前标签的面板间切换 |
| `⌘F` | 搜索回滚内容；搜索框中 Enter 下一个，Shift+Enter 上一个 |
| `⌘K` | 清理当前终端显示/回滚；不是删除服务器文件或 shell 历史 |
| `⌘+` / `⌘-` | 调大 / 调小终端字体 |
| `⌘C` / `⌘V` | 复制所选内容 / 粘贴 |
| `Ctrl+C` | 通常中断前台程序；不是复制 |

粘贴多行内容时默认先确认，因为其中的换行可能直接执行命令。可在设置中调整这一行为。

### 5.3 关闭、断线和重启

关闭普通 SSH 面板会断开连接；里面的任务可能因终端断开而结束，不能依靠普通 SSH 保证任务继续。某些自行脱离终端的进程可能仍存活，应另行检查，不能据断线认定任务一定已停。

重新打开软件会恢复标签、分屏和连接入口，**不会自动重连、不会重新执行旧命令**。点击面板中的“连接”或相应启动按钮，才会启动新的连接。

### 5.4 终端历史到底保存什么

**设置 → 终端历史 → 保存终端历史**，默认关闭。

| 内容 | 是否恢复 |
| --- | --- |
| 标签、分屏、连接入口 | 会恢复布局，连接需要手动启动 |
| 上次普通终端屏幕内容 | 开启历史后可只读显示 |
| 上次正在运行的程序 | 终端历史不能恢复 |
| tmux 会话内运行的程序 | 由远端 tmux 保持，重新接入查看 |
| shell 上下箭头查命令的历史 | 由对应 shell 自己管理，不由此开关负责 |

每面板默认保存 2000 行，可设 200–10000 行；还受每面板 1 MiB、总计 32 MiB 的限制。历史只存本机，不加密，可能包含你输入的命令回显和输出中的敏感内容。tmux 面板及 vim 等备用屏幕内容不作为普通终端历史保存。

关闭历史开关会删除全部已保存历史；关闭面板/标签会删除对应历史。清除历史不会停止当前程序；如果开关仍开启，之后的新内容还会继续保存。异常退出时最近约 2–10 秒的内容可能尚未写入。

<a id="tmux"></a>
## 6. tmux：关闭软件后继续运行与重新接入

### 6.1 要在远端服务器安装

SSHAdmin 的 tmux 管理操作的是**远端服务器上的 tmux**。仅在 Mac 上装 tmux，不能让服务器具备这项能力。软件不会自动安装它。

可只读检查：

```bash
sshadmin ssh dev-server 'command -v tmux; tmux -V'
```

如果提示没有 tmux，需要按服务器系统的方式安装，或由服务器管理员处理。

### 6.2 图形界面操作

1. 打开 **tmux** 页，选择主机；若提示未启用，点 **启用**。
2. 等待检测；看到“tmux server 未运行（无会话）”表示尚无会话，不一定是错误。
3. 填写会话名，例如 `work`，点 **新建并接入**。
4. 在该终端里启动任务。只有在这个 tmux 会话内启动的任务才受它管理。
5. 离开时分离或关闭标签。
6. 下次进入同一服务器、同一登录用户的 tmux 列表，点原会话的 **接入**。

列表显示名称、会话 ID、窗口数、已连接客户端数和创建时间。页面可见且窗口聚焦、上次查询成功时会约每 5 秒刷新；出错后可手动“刷新”。

“已连接客户端 0”通常只是没人正在观看，会话仍可运行。重命名不会重新启动任务；名称只能由 1–64 个英文字母、数字、下划线 `_` 或连字符 `-` 组成（不能含空格、冒号、点或中文）。

### 6.3 关闭软件后会怎样

| 情况 | 能否回到原任务 |
| --- | --- |
| 关闭 SSHAdmin / tmux 标签，或 Mac 断网 | 通常能，前提是远端 tmux 和任务仍在运行 |
| Mac 关机，但服务器继续运行 | 满足上面的条件时能 |
| 关闭的是普通 SSH，任务没有放进 tmux | 不保证继续，也不能通过 tmux 找回 |
| 在 tmux 页点击“结束” | 会结束对应会话，不能当作普通分离 |
| 在会话最后一个 shell 中执行 `exit` | 通常会结束该会话 |
| 服务器重启、tmux 被杀或任务自己退出 | 不能恢复原进程；当前版本没有进程恢复功能 |
| 远端是 WSL，WSL 被关闭或宿主机重启 | 同样无法保持原 tmux 进程 |

仅仅“启用 tmux 管理”不会把已经运行在普通 SSH 里的任务自动搬进去。需要先接入 tmux，再启动任务。

### 6.4 在自己的终端使用 tmux

以下命令在 Mac 的终端执行，`tmux` 部分会在服务器运行：

```bash
# 列出远端会话；没有会话时可能返回非零状态
sshadmin ssh dev-server 'tmux list-sessions'

# 新建 work 会话并接入；如果已存在，改用下一条接入命令
sshadmin ssh -t dev-server 'tmux new-session -s work'

# 接入已有会话
sshadmin connect dev-server --tmux work

# 按会话 ID 接入；单引号避免 $3 被本机 shell 展开
sshadmin connect dev-server --tmux '$3'
```

如果只想观看、不想误输入，可使用 tmux 的只读客户端：

```bash
sshadmin ssh -t dev-server 'tmux attach-session -r -t =work'
```

以上 tmux 创建、接入命令要求远端已安装 tmux。它们不是 `sshadmin tmux` 子命令；当前没有这个自定义子命令。

### 6.5 tmux 的常用按键

默认前缀为 `Ctrl+B`：先按住 Ctrl 按 B，松开，再按后面的键。若服务器改过 tmux 配置，以它的配置为准。

| 按键 | 作用 |
| --- | --- |
| `Ctrl+B` 然后 `D` | 分离，保留远端会话 |
| `Ctrl+B` 然后 `C` | 新建 tmux 窗口 |
| `Ctrl+B` 然后 `N` / `P` | 下一个 / 上一个 tmux 窗口 |
| `Ctrl+B` 然后 `[` | 进入 tmux 复制/回看模式；通常按 Q 退出 |
| `Ctrl+B` 然后 `?` | 查看按键帮助 |

这些是 tmux 自身的操作，和 SSHAdmin 的 `⌘D` 分屏属于不同层次。[tmux 官方入门](https://github.com/tmux/tmux/wiki/Getting-Started)

<a id="cli"></a>
## 7. 全部 SSHAdmin 自定义命令

### 7.1 命令安装与 PATH

如果 `~/.local/bin/sshadmin` 链接已经建立，且该目录在终端的 PATH 中，就可以直接使用 `sshadmin` 短命令。

还没有建立时，可点 **AI 接入 → 安装 sshadmin 命令**，或执行：

```bash
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin install-cli
```

安装只建立命令链接，不修改 shell 配置。检查：

```bash
command -v sshadmin
sshadmin --version
```

如果链接已安装，但出现 `command not found`，可先给当前终端增加 PATH：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

需要长期生效时，把上面这一行加入自己的 shell 配置，避免重复添加。macOS 常见交互 zsh 配置是 `~/.zshrc`；登录 shell 可用 `~/.zprofile`。添加后重新打开终端。AI 工具可能没有加载同一份 shell 配置，可重启该工具，或直接使用完整路径。

`PATH` 是终端寻找命令的目录列表。绝对路径调用不依赖 PATH：

```bash
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin ssh dev-server
```

### 7.2 完整命令清单

| 命令 | 参数 | 用途 |
| --- | --- | --- |
| `sshadmin list` | `--json` | 列出主机 |
| `sshadmin show <别名>` | `--json` | 主机详情 |
| `sshadmin doctor <别名>` | `--connect`、`--json` | 本地诊断或实际连接验证 |
| `sshadmin ssh …` | SSH 的选项、主机、远端命令 | 原生终端式访问 |
| `sshadmin exec <别名>` | `-c/--command`、`--json`、`--timeout`、`--stdin` | 单次执行、结构化结果 |
| `sshadmin connect <别名>` | `--tmux` | 交互登录或接入已有 tmux 会话 |
| `sshadmin trust <别名>` | `--json` | 人工确认指纹并测试 |
| `sshadmin credential set <别名>` | `--kind`、`--identity` | 保存密码或私钥口令 |
| `sshadmin credential unlink <别名>` | 无 | 解除凭据关联 |
| `sshadmin credential delete <别名>` | 无 | 解除关联并尝试删除钥匙串项 |
| `sshadmin install-cli` | `--dir`、`--json` | 安装短命令链接 |
| `sshadmin uninstall-cli` | `--dir`、`--json` | 移除短命令链接 |
| `sshadmin help` | 可接子命令名 | 查看帮助 |
| `sshadmin --help` / `-h` | 无 | 查看总帮助 |
| `sshadmin --version` / `-V` | 无 | 查看版本 |

当前没有 `sshadmin add`、`remove`、`tmux`、`backup`、`credential get` 等子命令。增删主机、配置备份、tmux 图形管理通过相应页面操作；也可通过 `sshadmin ssh` 执行服务器已有的命令。

`list/show/doctor/exec/connect/trust/credential` 面向已识别的精确别名。`sshadmin ssh` 是例外：它也可把未受管目标交给系统 SSH，但不会凭空获得那个目标的已保存密码。为了稳定复用凭据，日常和 AI 使用都优先用列表中的别名。

### 7.3 list：列出主机

```bash
sshadmin list
sshadmin list --json
```

只检查本机配置，不主动连接远端。JSON 包含主机别名、认证类型、凭据和 AI 状态等。`ai_ready` 为 `true` 表示有有效的无人值守验证记录；`false` 不一定是服务器故障，也可能只是尚未验证。

### 7.4 show：查看一台主机

```bash
sshadmin show dev-server
sshadmin show dev-server --json
```

可查看地址、端口、用户、来源、认证和最近验证情况。输出没有密码，私钥信息会作限制展示；地址和用户名等仍是连接信息，不等同于完全匿名的诊断导出。

### 7.5 doctor：诊断问题

```bash
# 仅本地检查，不连接服务器
sshadmin doctor dev-server

# 发起新连接，检查真实认证与有限的远程执行
sshadmin doctor dev-server --connect

# 给脚本或 AI 使用
sshadmin doctor dev-server --connect --json
```

`--connect` 会实际联网，并记录验证结果。它不会替人确认未知指纹或解决验证码；遇到这些情况使用 **测试并信任** 或交互入口。

### 7.6 ssh：像普通 SSH 一样使用

语法：

```text
sshadmin ssh [SSH选项] 别名 [远端命令]
```

常用例子：

```bash
# 登录交互 shell
sshadmin ssh dev-server

# 执行完自动退出
sshadmin ssh dev-server 'hostname; id -un; df -h'

# 给需要终端的程序分配伪终端，例如 top；按 Q 退出 top
sshadmin ssh -t dev-server top

# 设置连接超时和保活检查
sshadmin ssh -o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 dev-server

# 查看连接诊断信息
sshadmin ssh -v dev-server 'hostname'
```

这些选项来自 OpenSSH：`-t` 分配伪终端，`-T` 不分配，`-v` 输出调试信息，`-o` 设置 SSH 选项；`ConnectTimeout` 约束建立连接阶段，不是远端任务总时长。[OpenSSH 命令手册](https://man.openbsd.org/ssh)

SSHAdmin 的这个入口没有额外的任务时长或输出总量上限，也不返回结构化 JSON；网络、服务器和调用它的 AI/终端仍可能有自己的限制。

保存的密码只用于已确认的连接目标。如果用 `-p`、`-l`、`-J` 等改变了实际端口、用户或跳板，可能触发 `CREDENTIAL_BINDING_CHANGED`。正常修改这些内容应在软件中完成，再重新验证。

**引号怎么用：**远端命令通常用单引号包起来。`sshadmin ssh dev-server 'echo "$HOME"'` 中，`$HOME` 在远端展开。若改成双引号，可能先被本机 shell 展开。不要直接把不可信文字拼进命令。

### 7.7 exec：执行一次并获取结果

```bash
sshadmin exec dev-server --command 'df -h'
sshadmin exec dev-server -c 'hostname; id -un' --json
sshadmin exec dev-server -c 'uname -a' --timeout 30 --json
```

| 参数 | 说明 |
| --- | --- |
| `--command` / `-c` | 必填；整个远端 shell 命令作为一个参数 |
| `--json` | 最终输出单个 JSON，方便 AI/脚本读取 |
| `--timeout 秒数` | 本地等待上限，默认 60 秒；0 表示不设本地执行超时 |
| `--stdin` | 把本进程标准输入转发到远端；默认关闭 |

输入管道示例：

```bash
printf 'hello\n' | sshadmin exec dev-server -c 'wc -c' --stdin --json
```

`exec` 不分配交互终端，不适合 `vim`、`top`、交互式 sudo。需要这类交互时使用 `sshadmin ssh -t` 或软件终端。

stdout 和 stderr 的累计处理上限为 **8 MiB**。`--timeout 0` 只取消执行超时，不取消输出上限。持续输出或大数据流应使用 `sshadmin ssh`。

超时、取消、输出超限和网络中断不等于远端操作回滚；远端任务可能已经完成或仍在运行。先确认远端状态，再决定是否重新执行。

### 7.8 如何读 JSON 和退出码

`exec --json` 常用字段：

| 字段 | 含义 |
| --- | --- |
| `ok` | 是否成功 |
| `stdout` / `stderr` | 标准输出与错误输出；stderr 也可能含 SSH 诊断 |
| `stdout_encoding` / `stderr_encoding` | 通常为 `utf8`；二进制输出可能为 `base64` |
| `remote_exit_code` | 可信的远端退出码；不能确定时为 null |
| `ssh_exit_code` | SSH 进程退出码 |
| `result_certainty` | `completed` 已确定完成；`not_started` 未开始；`unknown` 结果未知 |
| `error.code` / `error.message` | 机器可读错误码 / 说明 |
| `error.action_required` | 建议下一步，可能为空 |
| `truncated` | 输出是否截断 |
| `duration_ms` | 执行耗时，毫秒 |

常见退出码：

| 退出码 | 说明 |
| --- | --- |
| 0 | 成功 |
| 1 | 常见应用错误；也可能是远端命令返回 1 |
| 2 | 参数错误；也可能是远端命令返回 2 |
| 124 | `exec` 本地超时 |
| 125 | `exec` 输出超限 |
| 130 | `exec` 被取消 |
| 255 | SSH 失败或远端返回 255，结果可能不确定 |
| 其他 1–254 | 远端非零退出码通常原样保留 |

同一个数字可能来自不同层次，尤其是远端程序也可以返回 124、125、130。自动化应结合 JSON 的 `error.code` 和 `result_certainty` 判断。`sshadmin ssh` 不使用这套 JSON，启动器失败通常为 255，连接后的状态遵循 SSH/远端进程。

### 7.9 connect：人的交互入口

```bash
sshadmin connect dev-server
sshadmin connect dev-server --tmux work
sshadmin connect dev-server --tmux '$3'
```

使用当前终端登录。`--tmux` 只接入**已经存在**的会话，不负责新建。它不接收 `--json` 或任意 SSH 选项；需要灵活传递选项，用 `sshadmin ssh`。

### 7.10 trust：人工信任并测试

```bash
sshadmin trust dev-server
sshadmin trust dev-server --json
```

必须在可交互的终端里执行。需要时确认指纹，之后测试交互连接与 AI 无交互连接。即使加 `--json`，也不代表变成无需人工确认的命令。AI 不应代替你盲目信任新指纹。

### 7.11 credential：保存、解除、删除

以下操作需要人在交互终端完成。密码输入不回显，并要求重复输入确认。

```bash
# 保存服务器登录密码；等提示时输入，不把密码写在命令后面
sshadmin credential set dev-server

# 显式指定登录密码类型，效果与上面相同
sshadmin credential set dev-server --kind password

# 保存某一把私钥的解锁口令；替换为你的真实私钥路径
sshadmin credential set dev-server --kind passphrase --identity "$HOME/.ssh/id_ed25519"

# 保存后完成信任与验证
sshadmin trust dev-server
```

两种移除操作，请按目的单独选择：

```bash
# 只解除关联，钥匙串条目保留
sshadmin credential unlink dev-server
```

```bash
# 先解除当前主机关联，再尝试删除钥匙串条目
sshadmin credential delete dev-server
```

若条目还被其他主机使用，`delete` 会保留条目并打印说明；不能只凭退出码 0 判断已经彻底删除，应看终端提示或凭据页。已解除关联的孤立条目，在 **凭据** 页删除。

没有 `--password` 参数，也不能通过 `echo 密码 | …` 保存密码。`credential` 子命令不支持 `--json`。

### 7.12 install-cli / uninstall-cli

```bash
# 默认目录为 ~/.local/bin
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin install-cli --json

# 可指定其他目录；该目录需要由你自己加入 PATH
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin install-cli --dir "$HOME/bin" --json
```

卸载命令链接：

```bash
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin uninstall-cli
```

若安装时使用了 `--dir`，卸载时指定同一个目录。安装不会覆盖别人的同名文件/链接，卸载只移除指向当前应用的链接。

**卸载 CLI 链接不会删除应用、主机配置、密码或服务器数据。**

### 7.13 查帮助

```bash
sshadmin --help
sshadmin help exec
sshadmin exec --help
sshadmin ssh --help
sshadmin credential --help
sshadmin credential set --help
sshadmin --version
```

`sshadmin ssh -V` 查询系统 SSH 的版本；`sshadmin --version` 查询 SSHAdmin 自身版本。不要混淆。

<a id="ai"></a>
## 8. 让本机 AI 使用服务器

### 8.1 你先完成一次准备

1. 主机已在 SSHAdmin 中正确配置。
2. 使用密码或私钥口令的主机，先保存凭据。
3. 完成 **测试并信任**，按需完成 macOS 钥匙串授权。
4. 允许本机 AI 使用该凭据，并确认 AI 就绪状态。
5. **AI 接入 → 复制给 AI 的说明**，交给能在本机执行终端命令的 AI。

SSHAdmin 不会自动修改所有 AI 工具的全局规则，也不是 MCP 服务。远程云端 AI 不能自动读取你这台 Mac 的配置和钥匙串。

### 8.2 可以直接给 AI 的简短说明

```text
本机已安装 SSHAdmin。优先使用 sshadmin；若找不到命令，使用：
/Applications/SSHAdmin.app/Contents/MacOS/sshadmin

先通过 sshadmin list --json 确认精确主机别名。
需要交互、实时输出、管道或长任务时，在你自己的终端使用：
sshadmin ssh <别名> '<已获授权的命令>'
需要结构化结果时使用：
sshadmin exec <别名> --command '<已获授权的命令>' --json

不要读取、导出或索要已保存密码，不把密码放进参数、脚本或日志。
使用已有别名，不擅自更改目标地址、账号、端口、跳板或主机信任记录。
遇到钥匙串授权、指纹变化、验证码或凭据错误时停止重试，告诉我具体原因。
超时或断线后先核实任务状态，不直接重放可能有副作用的命令。
需要关闭客户端后继续运行的任务，先进入远端 tmux，再启动任务。
按我授权的任务范围操作；新增破坏性操作先征得同意。
```

实际发给 AI 时，可以直接说：“使用 SSHAdmin 连接 `dev-server`，只查看主机名和磁盘使用情况。”你无需在聊天中提供密码。

### 8.3 三个常见疑问

- **必须打开 SSHAdmin 界面吗？** 不需要。CLI 可独立运行；凭据、信任、钥匙串状态仍需满足条件。
- **AI 用的是哪个终端？** `sshadmin ssh` 使用 AI 自己执行命令的终端，不会跳转到 SSHAdmin 内置终端。
- **AI 登录后为什么 sudo 还问密码？** SSH 登录认证和 sudo 提权是两回事；保存 SSH 密码不等于自动回答远端 sudo 或其他程序的密码提示。

<a id="recipes"></a>
## 9. 常用操作示例

### 9.1 只读检查服务器

```bash
sshadmin ssh dev-server 'hostname; id -un; uname -sr; uptime; df -h'
```

这些命令在服务器执行。不同服务器系统可能提供不同工具；此示例适用于常见 Linux 环境。

### 9.2 实时查看日志

用你确实有权限读取的日志路径替换示例：

```bash
sshadmin ssh dev-server 'tail -f /path/to/app.log'
```

按 `Ctrl+C` 停止跟踪。持续输出适合 `sshadmin ssh`，通常不适合有输出上限的 `exec --json`。

### 9.3 访问服务器仅监听本机的网页

假设服务器在 `127.0.0.1:3000` 提供网页，需要从 Mac 的 `http://127.0.0.1:8080` 访问：

```bash
sshadmin ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8080:127.0.0.1:3000 dev-server
```

保持这个命令运行，再用 Mac 浏览器访问本机 8080 端口。这里明确只监听 Mac 的回环地址；8080 已被占用时换一个本地端口。按 `Ctrl+C` 关闭转发。服务器必须允许 SSH 转发，目标服务也必须已启动。[OpenSSH 转发选项](https://man.openbsd.org/ssh)

### 9.4 在 tmux 中运行耗时任务

```bash
sshadmin ssh -t dev-server 'tmux new-session -s work'
```

进入后，再运行你自己的任务命令。需要离开时按 `Ctrl+B` 后 `D`；以后重新接入：

```bash
sshadmin connect dev-server --tmux work
```

tmux 保留的是运行环境，不会自动替任务生成完整持久日志。需要长期日志时，由任务自身或你明确指定的日志方式保存。

### 9.5 文件传输能不能用

当前没有内置 SFTP 文件管理器。`sshadmin ssh` 可配合需要远程 shell 的工具使用，例如在本机和服务器均安装 rsync 时：

```bash
# 仅预演，不实际传输；把路径与主机改成自己的
rsync -avn -e 'sshadmin ssh' ./local-dir/ dev-server:/path/to/remote-dir/
```

这是原生 rsync 的用法，`-n` 是预演。实际传输会写入目标目录，应确认路径后再执行相应操作。

不能把 `sshadmin ssh` 直接当作 `scp -S` / `sftp -S` 所需的单个程序路径。纯密钥认证仍可按原有方式使用系统 scp/sftp；保存密码不会自动让这些工具读取 SSHAdmin 凭据。

<a id="settings"></a>
## 10. 设置、备份与数据位置

### 10.1 常用设置

| 设置项 | 作用 |
| --- | --- |
| 主题 | 跟随系统、浅色、深色 |
| 终端字号 | 9–28 |
| 终端字体 | 使用本机可用字体；按字体列表填写 |
| 回滚缓冲行数 | 当前终端可往回查看的内容，1000–100000，默认 10000 |
| 粘贴多行内容前确认 | 减少一次粘贴误执行多条命令 |
| 光标闪烁 | 终端显示效果 |
| 保存终端历史 | 重启后查看上次的普通终端屏幕内容，默认关闭 |
| SSH 配置备份 | 查看自动备份并预览恢复 |
| 导出诊断 | 导出脱敏的状态信息，便于排错 |
| 关于 | 应用版本、系统 OpenSSH、实际程序与数据路径 |

### 10.2 配置备份与恢复

通过 SSHAdmin 修改 SSH 配置前会自动备份，保留最近 **20 份**。

恢复步骤：**设置 → SSH 配置备份 → 选择时间 → 预览恢复 → 检查差异 → 恢复**。

恢复会修改本地 SSH 配置，所以要核对预览。它不是整机备份，不会恢复钥匙串密码、私钥文件、运行中的进程或终端历史。外部手工修改也不等于每次都生成 SSHAdmin 备份。

需要编辑复杂 SSH 指令时，可从 **设置 → 编辑配置原文…** 进入。保存前仍会校验、展示差异和备份；不熟悉配置语法时优先使用主机表单。

### 10.3 数据放在哪里

`~` 表示当前用户主目录；例如 `/Users/demo`。

| 数据 | 默认位置 / 说明 |
| --- | --- |
| 应用 | `/Applications/SSHAdmin.app` |
| 主程序兼 CLI | `/Applications/SSHAdmin.app/Contents/MacOS/sshadmin` |
| 短命令链接 | `~/.local/bin/sshadmin` |
| SSH 主配置 | `~/.ssh/config` |
| SSHAdmin 托管主机 | `~/.ssh/sshadmin.conf` |
| 已信任服务器公钥 | 通常在 `~/.ssh/known_hosts`；可受 SSH 配置影响 |
| 主机备注、状态、设置等 | `~/Library/Application Support/SSHAdmin/sshadmin.db` |
| 配置备份 | `~/Library/Application Support/SSHAdmin/backups/` |
| 终端历史 | `~/Library/Application Support/SSHAdmin/history/` |
| 密码和私钥口令 | macOS 钥匙串；服务名 `com.sshadmin.credentials` |
| 私钥 | 仍在你选择的原文件位置，不自动复制 |

自动提交的凭据不会写入终端输出，但你自己运行的命令仍可能把其他敏感内容打印出来；开启历史后，这些屏幕内容可能被保存。

### 10.4 诊断导出

**设置 → 导出诊断…**，选择保存位置。内容包括版本、系统信息、主机数量、匿名状态和问题代码；不包含密码、别名、地址、用户名、私钥路径、备注和终端内容。

这与 `sshadmin show --json` 不同：后者是连接详情，可能包含主机地址和用户名。

<a id="troubleshooting"></a>
## 11. 常见问题与错误处理

### 11.1 遇到问题先做这三步

```bash
# 是否找得到程序
command -v sshadmin

# 别名是否正确，认证配置是否符合预期
sshadmin show dev-server

# 从本地问题查起；需要实际验证时再加 --connect
sshadmin doctor dev-server
```

实际连接失败时保留完整错误码；认证错误或结果未知时不要无限重试。

### 11.2 故障速查表

| 现象 / 错误码 | 含义与处理 |
| --- | --- |
| `command not found: sshadmin` | 短命令未安装或 PATH 不包含目录。看 7.1；可先使用绝对路径 |
| `HOST_NOT_FOUND` | 别名不存在。运行 `list`，不要把显示名称当别名 |
| `HOST_AMBIGUOUS` | 无法唯一定位主机，检查配置来源和重复/复杂定义 |
| `CREDENTIAL_MISSING` | 需要密码但未保存；在主机详情保存，再测试 |
| `CREDENTIAL_BINDING_CHANGED` | 目标、账号、端口、跳板或信任等与凭据绑定不同。核对后在软件内重新测试并信任 |
| `AI_CREDENTIAL_USE_DISABLED` | 该主机不允许 AI 使用已保存凭据；按你的意愿调整开关 |
| `KEYCHAIN_INTERACTION_REQUIRED` | 钥匙串锁定或尚需授权。打开软件完成授权，或在自己的交互终端用 `trust` / `connect` 处理；`ssh` / `exec` 的自动化入口不会替你弹框解决 |
| `KEYCHAIN_ACCESS_DENIED` | 钥匙串拒绝访问；检查该应用的授权 |
| `HOST_KEY_UNTRUSTED` | 指纹未信任，先由你核对服务器指纹 |
| `HOST_KEY_CHANGED` | 指纹与记录不同，先确认服务器是否重装/换机及真实指纹，不要直接跳过校验 |
| `AUTH_FAILED` / `Permission denied` | 用户名、密码、密钥或服务器认证策略不匹配；更新后再验证 |
| `AUTH_INTERACTION_REQUIRED` | 需要验证码、令牌、跳板机交互或其他人工步骤，使用交互终端处理 |
| `KEY_FILE_MISSING` | 私钥移动、删除或路径填错，重新选择 |
| `KEY_PERMISSION_INVALID` | 私钥权限过宽，先确认正确文件并修正权限 |
| `AGENT_UNAVAILABLE` | 当前进程看不到 SSH Agent；检查 agent 和密钥加载情况 |
| `AUTH_POLICY_CONFLICT` / `EXEC_CONFIG_CONFLICT` | SSH 配置和所选认证/执行方式冲突，依据提示检查实际配置 |
| `CONNECTION_TIMEOUT` | 地址、端口、VPN、网络、防火墙或服务器服务不可达 |
| `CONNECTION_FAILED` / `No route to host` | 检查网络和服务器；局域网还要检查 macOS 的本地网络权限 |
| `EXEC_TIMEOUT` / `EXEC_CANCELLED` / `OUTPUT_LIMIT_EXCEEDED` | 执行结果可能未知，先看服务器实际状态；持续任务改用 `ssh` / tmux |
| `SSH_OR_REMOTE_255` | SSH 失败或远端返回 255，结合 stderr 判断，不能自动认定未执行 |
| `REMOTE_COMMAND_FAILED` | 远端命令已结束但返回非零；查看命令输出和业务含义 |
| tmux 无会话 / server 未运行 | 通常是没有现有会话；如果预期有，确认服务器、用户、会话是否仍存活 |
| 远端没有 tmux | 需要在远端安装，SSHAdmin 不会自动安装 |
| 重开软件只有旧画面，没有输入响应 | 可能是历史只读内容或待恢复面板；点击连接，或到 tmux 页接入原会话 |

### 11.3 局域网访问：哪个应用需要授权

如果终端能连、SSHAdmin 不能连，检查 **系统设置 → 隐私与安全性 → 本地网络** 中 SSHAdmin 的开关。

如果由其他终端或 AI 应用发起连接，需要检查的是那个应用的权限。不能因为已经允许 SSHAdmin，就认定其他应用也已获准。服务器真正离线时也可能报相同网络错误。

### 11.4 有普通终端访问权限，AI 仍失败

常见原因包括 PATH 不同、钥匙串未授权、agent 环境不同、本地网络权限不同，以及 AI 工具自己的沙箱/审批限制。

先看错误来自 SSHAdmin、OpenSSH，还是 AI 工具自身。工具没有实际执行连接命令时，不能把它算成服务器连接失败。

### 11.5 两类权限不要混淆

- **SSH 登录**：能否登录服务器账户。
- **远端操作权限**：登录后的账户能读写哪些文件、能否执行 sudo。

能登录不代表有管理员权限。SSHAdmin 不会提升远端账户权限，也不会自动把 SSH 密码填入所有程序的密码提示。

<a id="maintenance"></a>
## 12. 更新、迁移、卸载与功能边界

### 12.1 图中的 OpenSSH 是哪一个

“设置 → 关于”显示当前 `/usr/bin/ssh -V` 的结果。它是系统 SSH，应用当前固定调用这个路径，没有绑定某个具体版本号。

macOS 更新该程序后，后续连接使用更新后的版本；另行安装 Homebrew 的 SSH 不会自动切换此路径。正常升级 SSH 不会清除独立保存的主机配置和钥匙串密码。新版本与旧服务器的兼容性仍需要验证，不能保证所有未来版本行为完全一致。

### 12.2 更新 SSHAdmin

将新版本应用按原安装方式放回 `/Applications/SSHAdmin.app`。安装路径相同时，短命令链接通常仍指向正确位置。更新后检查：

```bash
sshadmin --version
sshadmin list
sshadmin doctor dev-server --connect
```

若代码签名身份变化，macOS 可能要求重新授权钥匙串。当前 `0.1.0` 版本号不足以区分所有本地重新打包版本，因此排错时也要说明更新日期和实际现象。

### 12.3 换电脑时需要哪些东西

当前没有一键跨设备同步或完整迁移功能。只复制 SSH 配置不能复制所有能力。

需要分别考虑 SSH 配置及 Include 文件、原私钥文件、SSHAdmin 元数据、钥匙串凭据、新电脑的权限与命令 PATH。路径变化后要重新指定私钥；钥匙串授权与数据迁移按 macOS 的实际迁移方式处理，不能把密码放进普通文本备份来代替。

先保留旧环境，再在新环境逐台验证。自动配置备份不能代替完整迁移。

### 12.4 卸载包含不同层次

| 目标 | 处理方式 |
| --- | --- |
| 不再使用 `sshadmin` 短命令 | `uninstall-cli`，其他数据保留 |
| 不再使用某台主机 | 主机页删除对应连接配置 |
| 不再保留某个密码 | 解除关联后在凭据页删除，或使用对应 credential 命令 |
| 不再保存终端历史 | 设置里关闭历史开关 |
| 删除应用 | 移除 SSHAdmin.app；不会自动清理所有配置和钥匙串内容 |

不要直接删除整个 `~/.ssh` 来卸载软件，其中可能还有其他工具依赖的配置和密钥。彻底清理用户数据需要按明确范围单独处理。

### 12.5 当前功能边界

支持本机主机管理、系统 SSH、密码与密钥、终端分屏、远端 tmux、AI 命令行接入、配置备份和可选终端历史。

当前未提供：多人账号权限、云同步、Web 管理端、内置 SFTP 文件管理器、批量广播命令、MCP 服务、自动安装远端软件/公钥、服务器重启后的进程恢复。

安装包目前以 Apple Silicon 为已验证平台，本地签名、未公证。其他架构和系统版本以项目实际验收记录为准。

<a id="references"></a>
## 13. 核验范围与进一步阅读

本手册对照了本机已安装程序的总帮助、全部公开子命令帮助，以及当前界面和 Rust 实现。尤其核对了凭据子命令名、exec 默认 60 秒和 8 MiB 上限、tmux 接入方式、终端快捷键、历史保存边界及 CLI 安装行为。

本次编写没有执行密码变更、删除凭据、恢复配置、结束 tmux 或文件传输示例。GUI 步骤依据当前实现核对，不宣称本次逐个点击验收。

公开资料与下载入口：

- [SSHAdmin 官网](https://dfbtcice.github.io/sshadmin/)：产品介绍、演示视频和安装包。
- [0.1.0 版本下载](https://github.com/DFBTCice/sshadmin/releases/tag/v0.1.0)：Mac 安装包、离线手册、完整使用动画及 SHA-256 校验值。
- [反馈问题](https://github.com/DFBTCice/sshadmin/issues)：请说明应用版本、macOS 版本、操作步骤和错误信息；不要提交密码、私钥或未脱敏的服务器配置。

应用源码暂不公开。日常查找优先用文档目录或浏览器的 `⌘F`；命令以已安装版本的 `sshadmin --help` 为准。
