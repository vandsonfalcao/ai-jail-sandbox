FROM node:20-bookworm-slim

# Instalar dependências básicas do sistema e o Gemini CLI globalmente
RUN apt-get update \
  && apt-get install -y git ca-certificates curl iputils-ping \
  && npm install -g @google/gemini-cli@latest \
  && mkdir -p /root/.gemini \
  && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho padrão dentro do container
WORKDIR /workspace

# Resetar o entrypoint para permitir a execução de comandos arbitrários diretamente
ENTRYPOINT []

# Shell padrão ao abrir o container sem argumentos
CMD ["bash"]
