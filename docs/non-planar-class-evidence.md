# 复杂类图为何不能保留全部关系并完全消除交叉

对应样例是 `demo/stress-cases.js` 的 `stress-class-hierarchy`。该样例没有被删减来回避问题。
以下是拓扑证据，不把寻路预算耗尽当作不可解证明。

忽略方向、合并重复关系后，该图含有 `K3,3` 的细分。六个分支点分成两组：

- 左组：`RootService`、`Service2`、`Service4`
- 右组：`Service0`、`Service1`、`Service3`

左右每一对都有一条路径，九条路径的内部节点互不相交：

| 左组 | 右组 | 原图中的路径 |
| --- | --- | --- |
| RootService | Service0 | RootService → Service0 |
| RootService | Service1 | RootService → Service1 |
| RootService | Service3 | RootService → Service3 |
| Service2 | Service0 | Service2 → Service12 → Service0 |
| Service2 | Service1 | Service2 → Service13 → Service1 |
| Service2 | Service3 | Service2 → Service15 → Service3 |
| Service4 | Service0 | Service4 → Service0 |
| Service4 | Service1 | Service4 → Service23 → Service11 → Service1 |
| Service4 | Service3 | Service4 → Service16 → Service3 |

这些路径只使用样例中已有的关系。沿路径压缩度为2的内部点得到 `K3,3`；
它无法在平面上同时保持所有边、互不重叠且零交叉。因此不能仅靠移动节点或绕曲线满足全部条件。
删除关系、把无关关系合并成共享线或遮住交点，都不是修复原图。

离线验证使用 NetworkX 3.2.1 `check_planarity(counterexample=True)`；
12节点15边的证书已检查每条路径来自原图、内部点不相交，删去任意证书边后可平面化。
本地完整证据在 `output/playwright/arrow-detail/planarity.json`，最小可移植证据就是上面的路径表。
纯单测同时保留 `K3,3`、`K5` 和 `K3,3` 全边细分反例，防止平面布局候选假报成功。

该结论只针对上述证书。其它图返回 `unresolved` 不能据此判断不可平面化。
此前的 `stress-er-network` 可以平面化，已经通过基于结构的外围环/重心候选实现零交叉；
它与这张类图不能混为一谈。
