import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# .env ファイルから環境変数を読み込む
load_dotenv()

class Database:
    def __init__(self):
        self.db_name = os.getenv("POSTGRES_DB")
        self.user = os.getenv("POSTGRES_USER")
        self.password = os.getenv("POSTGRES_PASSWORD")
        self.host = os.getenv("POSTGRES_HOST")
        self.port = os.getenv("POSTGRES_PORT")
        self.connection = None

    def connect(self):
        """データベースに接続する"""
        try:
            self.connection = psycopg2.connect(
                dbname=self.db_name,
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port
            )
        except Exception as e:
            raise Exception(f"データベース接続失敗: {str(e)}")

    def close(self):
        """データベース接続を閉じる"""
        if self.connection:
            self.connection.close()

    def fetch_table(self, query, params=None):
        """任意のテーブルからデータを取得する"""
        if not self.connection:
            raise Exception("データベースに接続していません")

        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()
        except Exception as e:
            raise Exception(f"データ取得失敗: {str(e)}")
        
    def execute(self, query, params=None):
        """任意のクエリを実行する"""
        if not self.connection:
            raise Exception("データベースに接続していません")

        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query, params)
        except Exception as e:
            raise Exception(f"クエリ実行失敗: {str(e)}")
