# ECS Deployment

## Prerequisites
- AWS CLI configured (`aws configure`)
- Docker
- ECR repo created: `plcgallery`
- ECS cluster + service
- ALB + target group (target type = `ip` for Fargate)

## 1) Build & push image to ECR

```bash
AWS_REGION=ap-northeast-2
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=plcgallery
TAG=$(git rev-parse --short HEAD)

aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Supabase env is baked into the bundle at build-time (public anon key only)
docker build \
  --platform linux/amd64 \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t $REPO:$TAG .

docker tag $REPO:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$TAG
docker tag $REPO:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
```

## 2) Register task definition

Edit `ecs-task-definition.json` — replace `ACCOUNT_ID` and region. Then:

```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region $AWS_REGION
```

## 3) Update service

```bash
aws ecs update-service \
  --cluster plcgallery-cluster \
  --service plcgallery-web \
  --task-definition plcgallery \
  --force-new-deployment \
  --region $AWS_REGION
```

## Notes
- The service role key is **never** included in the image. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public).
- RLS on Supabase is the only authorization boundary — verify policies before production.
- For multi-environment deploys, build separate tags with different `VITE_SUPABASE_URL` args.
