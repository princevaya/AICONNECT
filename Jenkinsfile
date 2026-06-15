pipeline {
    agent any

    environment {
        // Name of the Docker image
        IMAGE_NAME = 'aiconnect'
        
        // Name of the container that will be deployed on the host
        CONTAINER_NAME = 'aiconnect-app'
        
        // Host port to expose the application (maps to container port 3000)
        HOST_PORT = '3000'
        
        // Path to the production .env file on your server.
        // You can use an absolute path like '/etc/aiconnect/.env' or a relative path '.env'
        // if you place the .env file directly in the Jenkins project workspace directory.
        ENV_FILE_PATH = '.env'
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout code from Git SCM
                checkout scm
            }
        }

        stage('Build Builder Stage (For Migrations)') {
            steps {
                echo 'Building temporary builder stage to execute database migrations...'
                // Build only up to the "builder" stage to get access to prisma/migrations and node_modules
                sh "docker build --target builder -t ${env.IMAGE_NAME}-builder:${env.BUILD_NUMBER} ."
            }
        }

        stage('Run Database Migrations') {
            steps {
                echo 'Running database migrations via Prisma...'
                // Run migrations against the database using the temporary builder image and loading .env variables
                sh "docker run --rm --env-file ${env.ENV_FILE_PATH} ${env.IMAGE_NAME}-builder:${env.BUILD_NUMBER} npx prisma migrate deploy"
            }
        }

        stage('Build Production Image') {
            steps {
                echo 'Building production image...'
                // Build the full multi-stage Dockerfile (defaults to the runner stage)
                sh "docker build -t ${env.IMAGE_NAME}:${env.BUILD_NUMBER} -t ${env.IMAGE_NAME}:latest ."
            }
        }

        stage('Deploy Container') {
            steps {
                echo "Stopping and removing existing container if running..."
                sh "docker stop ${env.CONTAINER_NAME} || true"
                sh "docker rm ${env.CONTAINER_NAME} || true"

                echo "Starting new container on port ${env.HOST_PORT}..."
                // Start the new container loading the .env file directly
                sh """
                    docker run -d \
                      --name ${env.CONTAINER_NAME} \
                      -p ${env.HOST_PORT}:3000 \
                      --restart always \
                      --env-file ${env.ENV_FILE_PATH} \
                      ${env.IMAGE_NAME}:latest
                """
            }
        }

        stage('Health Check') {
            steps {
                echo 'Verifying application health...'
                // Wait briefly for server startup
                sh "sleep 5"
                // Curl the endpoint. Accepts 200 or 3xx redirection codes (Clerk login redirect is expected).
                sh "curl -I -s -L http://localhost:${HOST_PORT} | grep -E 'HTTP/1.1 200|HTTP/2 200|HTTP/1.1 30|HTTP/2 30' || exit 1"
            }
        }
    }

    post {
        always {
            node('') {
                echo 'Cleaning up build-time images...'
                sh "docker rmi ${env.IMAGE_NAME ?: 'aiconnect'}-builder:${env.BUILD_NUMBER} || true"
            }
        }
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            node('') {
                echo 'Deployment failed. Fetching container logs for debugging...'
                sh "docker logs ${env.CONTAINER_NAME ?: 'aiconnect-app'} || true"
            }
        }
        cleanup {
            node('') {
                echo 'Cleaning up unused Docker images/layers to reclaim disk space...'
                sh "docker image prune -f || true"
            }
        }
    }
}
