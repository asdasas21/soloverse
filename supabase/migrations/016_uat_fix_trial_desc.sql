-- UAT fix #8: 为技术术语添加通俗解释
-- MVP → 最小可用产品
-- RAG → 检索增强生成（让AI先查资料再回答）
-- diff → 代码变更对比

UPDATE public.trials SET description = '48小时内完成一个AI Agent项目，从零到可运行的最小可用产品（MVP）。Agent将实时观察你的编码行为并评估底层能力。'
WHERE id = 'hackathon-1';

UPDATE public.trials SET description = '构建一个检索增强生成（RAG）系统——让AI先查资料再回答，展示你的技术深度和AI工具运用能力。'
WHERE id = 'rag-system';

UPDATE public.trials SET title = 'RAG 系统搭建（检索增强生成）'
WHERE id = 'rag-system';
