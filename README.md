# Noda

## Docker Usage

```
$ docker run -p 6111:6111 andrewda/noda:latest
```

The application should now be accessible at `https://localhost:6111`.

## Development

First, make sure to initialize the Git submodules:

```
$ git submodule update --init
```

The Docker image can then be built locally using the following command:

```
$ docker build -t andrewda/noda:latest .
```
