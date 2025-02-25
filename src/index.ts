#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { tools, Tool } from "./tools.js";

class PerplexityServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: "perplexity-mcp-server",
      version: "0.1.0"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema
        }))
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const tool = tools.find(t => t.name === request.params.name) as Tool;
        
        if (!tool) {
          return {
            content: [{
              type: "text",
              text: `Unknown tool: ${request.params.name}`
            }],
            isError: true
          };
        }

        try {
          const result = await tool.handler(request.params.arguments || {});
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Perplexity API error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Perplexity MCP server running on stdio");
  }
}

const server = new PerplexityServer();
server.run().catch(console.error);