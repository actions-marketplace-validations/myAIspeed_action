# MyAISpeed GitHub Action

Test connection latency to major AI providers directly from your CI/CD pipeline.

## Quick Start

```yaml
- uses: myAIspeed/action@v1
  id: speed
- run: echo "Fastest: ${{ steps.speed.outputs.fastest-provider }} (${{ steps.speed.outputs.fastest-latency }}ms)"
```

## Usage

```yaml
- uses: myAIspeed/action@v1
  id: speed
  with:
    providers: 'all'          # Comma-separated list or 'all'
    fail-threshold: '0'       # Fail if any provider exceeds this ms (0 = never fail)
    json-output: 'false'      # Log results as JSON
```

### Inputs

| Input | Description | Default |
|---|---|---|
| `providers` | Comma-separated list of provider slugs to test, or `all` | `all` |
| `fail-threshold` | Fail the step if any provider latency exceeds this value in ms. Set to `0` to never fail. | `0` |
| `json-output` | Set to `true` to include JSON-formatted results in the log output | `false` |

### Outputs

| Output | Description |
|---|---|
| `results` | JSON array of all test results |
| `fastest-provider` | Slug of the fastest responding provider |
| `fastest-latency` | Latency of the fastest provider in milliseconds |

## Examples

### Fail if latency exceeds 500ms

```yaml
steps:
  - uses: myAIspeed/action@v1
    id: speed
    with:
      fail-threshold: '500'
```

### Save results as an artifact

```yaml
steps:
  - uses: myAIspeed/action@v1
    id: speed
    with:
      json-output: 'true'

  - run: echo '${{ steps.speed.outputs.results }}' > latency-results.json

  - uses: actions/upload-artifact@v4
    with:
      name: ai-latency-results
      path: latency-results.json
```

### Test specific providers

```yaml
steps:
  - uses: myAIspeed/action@v1
    id: speed
    with:
      providers: 'openai,anthropic,google'
```

## About

Built by [Reflect Memory, Inc.](https://myaispeed.com) — measure and monitor AI provider performance from anywhere.

Visit [myaispeed.com](https://myaispeed.com) to learn more.
