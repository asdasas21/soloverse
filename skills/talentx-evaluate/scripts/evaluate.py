#!/usr/bin/env python3
"""TalentX Evaluation Script - Can be called by AI agents"""

import json
import sys
from datetime import datetime


def ema_compute(events, alpha=0.3, implicit_factor=0.15):
    """EMA engine: base score -> implicit correction -> time decay"""
    dimensions = ['curiosity', 'reliability', 'fact_checking',
                  'diverse_thinking', 'uncertainty_tolerance', 'lowego_high_drive']

    portrait = {}
    for dim in dimensions:
        dim_events = [e for e in events if e.get('dimension') == dim]
        if not dim_events:
            portrait[dim] = 0.5
            continue

        scores = []
        for e in dim_events:
            s = e['score_raw']
            if e.get('is_implicit'):
                s = min(1.0, s * (1 + implicit_factor))
            scores.append(s)

        ema = scores[0]
        for s in scores[1:]:
            ema = alpha * s + (1 - alpha) * ema
        portrait[dim] = round(ema, 3)

    return portrait


def cert_level(score):
    if score >= 88:
        return 'C3'
    elif score >= 75:
        return 'C2'
    elif score >= 60:
        return 'C1'
    return None


def evaluate(input_data):
    events = input_data.get('events', [])
    portrait = ema_compute(events)
    score = sum(portrait.values()) / len(portrait) * 100
    level = cert_level(score)

    return {
        'portrait': portrait,
        'cert_score': round(score, 1),
        'cert_level': level,
        'evaluated_at': datetime.now().isoformat(),
        'recommendations': generate_recommendations(portrait)
    }


def generate_recommendations(portrait):
    recs = []
    dim_names = {
        'curiosity': '好奇心',
        'reliability': '靠谱',
        'fact_checking': '事实洁癖',
        'diverse_thinking': '多元化思维',
        'uncertainty_tolerance': '忍受不确定性',
        'lowego_high_drive': '低ego高自驱'
    }
    for dim, value in portrait.items():
        if value < 0.6:
            recs.append(f"{dim_names.get(dim, dim)}较低({value:.0%})，建议通过更多实践提升")
    return recs


if __name__ == '__main__':
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    result = evaluate(data)
    print(json.dumps(result, ensure_ascii=False, indent=2))
