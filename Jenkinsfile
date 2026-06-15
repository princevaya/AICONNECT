pipeline {
    agent any

    environment {
        // Name of the Docker image
        IMAGE_NAME = 'aiconnect'
        
        // Name of the container that will be deployed on the host
        CONTAINER_NAME = 'aiconnect-app'
        
        // Host port to expose the application (maps to container port 3000)
        HOST_PORT = '3000'
        
        // Jenkins Credentials Bindings.
        // It is highly recommended to configure these in the Jenkins UI
        // under Credentials -> System -> Global Credentials.
        DATABASE_URL = credentials('aiconnect-database-url')
        CLERK_SECRET_KEY = credentials('aiconnect-clerk-secret-key')
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = credentials('aiconnect-clerk-publishable-key')
        
        // Add other runtime env variables here if required (e.g. AWS credentials)
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
                sh "docker build --target builder -t ${IMAGE_NAME}-builder:${BUILD_NUMBER} ."
            }
        }

        stage('Run Database Migrations') {
            steps {
                echo 'Running database migrations via Prisma...'
                // Run migrations against the database using the temporary builder image.
                // This keeps build utilities and dependencies outside the production runtime image.
                sh "docker run --rm --env DATABASE_URL='${DATABASE_URL}' --env DIRECT_URL='${DATABASE_URL}' ${IMAGE_NAME}-builder:${BUILD_NUMBER} npx prisma migrate deploy"
            }
        }

        stage('Build Production Image') {
            steps {
                echo 'Building production image...'
                // Build the full multi-stage Dockerfile (defaults to the runner stage)
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Deploy Container') {
            steps {
                echo "Stopping and removing existing container if running..."
                sh "docker stop ${CONTAINER_NAME} || true"
                sh "docker rm ${CONTAINER_NAME} || true"

                echo "Starting new container on port ${HOST_PORT}..."
                // Start the new container with production environment variables
                sh """
                    docker run -d \
                      --name ${CONTAINER_NAME} \
                      -p ${HOST_PORT}:3000 \
                      --restart always \
                      -e DATABASE_URL='${DATABASE_URL}' \
                      -e CLERK_SECRET_KEY='${CLERK_SECRET_KEY}' \
                      -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}' \
                      -e NODE_ENV=production \
                      ${IMAGE_NAME}:latest
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
            echo 'Cleaning up build-time images...'
            sh "docker rmi ${IMAGE_NAME}-builder:${BUILD_NUMBER} || true"
        }
        success {
            echo 'Deployment completed successfully!'
        }
        failure {
            echo 'Deployment failed. Fetching container logs for debugging...'
            sh "docker logs ${CONTAINER_NAME} || true"
        }
        cleanup {
            echo 'Cleaning up unused Docker images/layers to reclaim disk space...'
            sh "docker image prune -f || true"
        }
    }
}
