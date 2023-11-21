# Docker image for converting video files

## Building the image and uploading to ECR

### Prod

Run the following from within the ECS folder

1. Get credentials
    ```
    aws ecr get-login-password --region ${AWS::Region} | docker login --username AWS --password-stdin ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com
    ```
2. Build image
    ```
    docker build -t post-processing-wffmpeg-service-ecrrepo-ifyln9vdqged .
    ```
3. Tag image
    ```
    docker tag post-processing-wffmpeg-service-ecrrepo-ifyln9vdqged:latest ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/post-processing-wffmpeg-service-ecrrepo-ifyln9vdqged:latest
    ``` 
4. Upload image to ECR
    ```
    docker push ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/post-processing-wffmpeg-service-ecrrepo-ifyln9vdqged:latest
    ```

### Beta

1. Get credentials
    ```
    aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 093675026797.dkr.ecr.us-west-2.amazonaws.com
    ```
2. Build image
    ```
    docker build -t post-processing-wffmpeg-service-ecrrepo-a4e0cch5sln0 .
    ```
3. Tag image
    ```
    docker tag post-processing-wffmpeg-service-ecrrepo-a4e0cch5sln0:latest 093675026797.dkr.ecr.us-west-2.amazonaws.com/post-processing-wffmpeg-service-ecrrepo-a4e0cch5sln0:latest
    ``` 
4. Upload image to ECR
    ```
    docker push 093675026797.dkr.ecr.us-west-2.amazonaws.com/post-processing-wffmpeg-service-ecrrepo-a4e0cch5sln0:latest
    ```