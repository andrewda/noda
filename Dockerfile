FROM node:23-alpine AS frontend-build
WORKDIR /build

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application and run the build
COPY next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build


FROM continuumio/miniconda3
WORKDIR /app

COPY --from=frontend-build /build/out ./out
COPY public ./public
COPY AirTrafficSim ./AirTrafficSim

RUN mkdir -p certificates && \
    openssl req -x509 -nodes -newkey rsa:2048 -keyout certificates/localhost-key.pem -out certificates/localhost.pem -days 365 -subj "/CN=localhost"

WORKDIR /app/AirTrafficSim

RUN apt update && \
    apt install unzip && \
    rm -rf airtrafficsim/data/navigation/xplane airtrafficsim/data/performance/BADA && \
    unzip data.zip

# Create the conda environment defined in environment.yml
RUN conda env create -f environment.yml && conda clean -afy

# Ensure the conda environment binaries are available in the PATH
ENV PATH=/opt/conda/envs/airtrafficsim/bin:$PATH

EXPOSE 6111
CMD ["python", "-m", "airtrafficsim"]
