from psycopg2 import pool
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv, find_dotenv
import psycopg2
import logging

load_dotenv(find_dotenv())

#logger = logging.getLogger(__name__)

# Sizing Your Pool
# The optimal pool size depends on:

# Number of concurrent requests
# Query duration
# Database server resources

# General formula:
# pool_size = (concurrent_requests * avg_query_duration) / response_time_target + buffer

# Example calculation:
# - 100 concurrent requests
# - 10ms average query duration
# - 50ms response time target
# - Buffer: 20%

# pool_size = (100 * 0.01) / 0.05 * 1.2 = 24 connections

class DatabasePool:
    """Connection pool with context manager support"""

    _instance = None

    def __init__(
        self,
        dsn: str,
        min_conn: int = 2,
        max_conn: int = 20
    ):
        self._pool = pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn=dsn
        )

    @classmethod
    def initialize(cls, dsn: str, min_conn: int = 2, max_conn: int = 20):
        """Initialize the singleton pool"""
        if cls._instance is None:
            cls._instance = cls(dsn, min_conn, max_conn)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'DatabasePool':
        """Get the pool instance"""
        if cls._instance is None:
            raise RuntimeError("Pool not initialized")
        return cls._instance

    @contextmanager
    def connection(self) -> Generator:
        """Context manager for getting a connection"""
        conn = None
        try:
            conn = self._pool.getconn()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                self._pool.putconn(conn)

    @contextmanager
    def cursor(self, commit: bool = True) -> Generator:
        """Context manager for getting a cursor"""
        with self.connection() as conn:
            cursor = conn.cursor()
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cursor.close()

    def execute(self, query: str, params: tuple = None, fetch: bool = True):
        """Execute a query and optionally fetch results"""
        with self.cursor() as cur:
            cur.execute(query, params)
            if fetch:
                return cur.fetchall()

    def execute_many(self, query: str, params_list: list):
        """Execute a query with multiple parameter sets"""
        with self.cursor() as cur:
            cur.executemany(query, params_list)

    def close(self):
        """Close all connections"""
        self._pool.closeall()
